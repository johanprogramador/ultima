import logging
import time
from datetime import datetime, timedelta
import jwt # type: ignore
import pandas as pd  # type: ignore
from fuzzywuzzy import process  # type: ignore
from django.conf import settings  # type: ignore
from django.core.exceptions import ObjectDoesNotExist
from django.core.mail import send_mail  # type: ignore
from django.db import IntegrityError, transaction
from django.db.models import Count, ExpressionWrapper, F, FloatField, Q, Sum
from django.http import JsonResponse
from django.shortcuts import get_object_or_404, render
from django.utils import timezone
from django.views.decorators.cache import never_cache, cache_control
from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth import authenticate, login as django_login
from django.contrib.auth.hashers import make_password  # type: ignore
from django.contrib.auth.models import User
from django.contrib.auth.decorators import login_required  # type: ignore
from rest_framework import viewsets, filters, status, generics # type: ignore
from rest_framework.authentication import TokenAuthentication # type: ignore
from rest_framework.decorators import (  # type: ignore
    api_view, parser_classes, permission_classes,
    action, authentication_classes
) # type: ignore
from rest_framework.parsers import MultiPartParser # type: ignore
from rest_framework.permissions import AllowAny, IsAuthenticated # type: ignore
from rest_framework.response import Response # type: ignore
from django_filters.rest_framework import DjangoFilterBackend  # type: ignore
from rest_framework_simplejwt.tokens import AccessToken, RefreshToken # type: ignore
from rest_framework_simplejwt.exceptions import TokenError # type: ignore
from .models import RolUser, Sede, Dispositivo, Servicios, Posicion, Historial, Movimiento
from .serializers import (
    RolUserSerializer, ServiciosSerializer, LoginSerializer,
    DispositivoSerializer, SedeSerializer, PosicionSerializer, HistorialSerializer,  MovimientoSerializer
)
from .pagination import StandardPagination
from .utils import importar_excel, exportar_excel

logger = logging.getLogger(__name__)


@login_required
@never_cache  # Evita que se pueda acceder con "Atrás"
def dashboard(request):
    return render(request, 'dashboard.html')

@api_view(['GET'])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
def dashboard(request):
    return Response({"message": "Bienvenido al dashboard"}) 

@api_view(['GET' ])
@permission_classes([IsAuthenticated])  # Solo los usuarios autenticados pueden acceder
def get_users_view(request):

    users = RolUser.objects.all()
    
    serializer = RolUserSerializer(users, many=True)

    return Response(serializer.data)

class RolUserViewSet(viewsets.ModelViewSet):
    queryset = RolUser.objects.all()
    serializer_class = RolUserSerializer

@api_view(['POST'])
@permission_classes([AllowAny])
@csrf_exempt
def login_user(request):
    try:
        # Limpiar sesión existente
        if hasattr(request, 'session'):
            request.session.flush()
        username = request.data.get('username', '').strip()
        password = request.data.get('password', '').strip()
        sede_id = request.data.get('sede_id', None)
        
        if not username or not password:
            return Response(
                {'error': 'Usuario y contraseña requeridos'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        user = authenticate(username=username, password=password)
        
        if not user:
            logger.warning(f"Intento fallido de login para usuario: {username}")
            return Response(
                {'error': 'Credenciales inválidas'},
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        if not user.is_active:
            logger.warning(f"Intento de login para usuario inactivo: {username}")
            return Response(
                {'error': 'Cuenta desactivada'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Lógica diferente según el rol del usuario
        if user.rol == 'admin':
            # Admin puede ingresar sin sede
            sede = None
            sede_id = None
            sede_nombre = None
        elif user.rol == 'coordinador':
            # Coordinador debe tener sede
            if not sede_id:
                return Response(
                    {'error': 'Debe seleccionar una sede'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            try:
                sede = Sede.objects.get(id=sede_id)
                # Verificar que el coordinador tenga esta sede asignada
                if not user.sedes.filter(id=sede_id).exists():
                    return Response(
                        {'error': 'No tiene permisos para acceder a esta sede'},
                        status=status.HTTP_403_FORBIDDEN
                    )
                sede_nombre = sede.nombre
            except Sede.DoesNotExist:
                return Response(
                    {'error': 'Sede no encontrada'},
                    status=status.HTTP_404_NOT_FOUND
                )
        else:
            # Para otros roles no definidos (por si acaso)
            return Response(
                {'error': 'Rol de usuario no válido'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Iniciar sesión correctamente
        django_login(request, user)
        request.session['last_activity'] = timezone.now().isoformat()
        if sede_id:
            request.session['sede_id'] = sede_id  # Solo almacenar sede si existe
        
        # Generar tokens JWT
        refresh = RefreshToken.for_user(user)
        
        logger.info(f"Login exitoso para usuario: {username} (Rol: {user.rol})")
        
        return Response({
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'username': user.username,
            'email': user.email,
            'rol': user.rol,
            'sede_id': sede_id,
            'sede_nombre': sede_nombre if user.rol == 'coordinador' else None,
            'sessionid': request.session.session_key,
            'message': 'Autenticación exitosa'
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"Error en login: {str(e)}", exc_info=True)
        return Response(
            {'error': 'Error interno del servidor'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
        
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def keepalive(request):
    request.session['last_activity'] = timezone.now().isoformat()
    request.session.save()
    return Response({
        "status": "active",
        "user": {
            "id": request.user.id,
            "username": request.user.username,
            "email": request.user.email
        },
        "last_activity": request.session['last_activity'],
        "session_expiry": request.session.get_expiry_date()
    }, status=status.HTTP_200_OK)
    
@api_view(["GET"])  # Cambiado a GET ya que es una verificación
@permission_classes([])
def validate_token(request):
    auth_header = request.headers.get("Authorization")
    
    if not auth_header:
        return Response(
            {"error": "Token no proporcionado"}, 
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        # Verificar formato del header
        if not auth_header.startswith("Bearer "):
            raise TokenError("Formato de token inválido")
            
        token = auth_header.split(" ")[1]
        AccessToken(token).verify()  # Verifica expiración y firma
        
        return Response({
            "message": "Token válido",
            "is_valid": True
        }, status=status.HTTP_200_OK)
        
    except TokenError as e:
        return Response({
            "error": str(e),
            "is_valid": False
        }, status=status.HTTP_401_UNAUTHORIZED)
    except Exception as e:
        return Response({
            "error": "Error al procesar el token",
            "details": str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def obtener_datos_protegidos(request):
    return Response({"message": "Datos protegidos disponibles solo para usuarios autenticados"})
@api_view(['GET'])
@permission_classes([])  
def get_users_view(request):
    users = RolUser.objects.all()
    serializer = RolUserSerializer(users, many=True)
    return Response(serializer.data)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def user_detail_view(request, user_id):
    try:
        user = RolUser.objects.get(id=user_id)
    except RolUser.DoesNotExist:
        return Response({"error": "Usuario no encontrado."}, status=404)

    serializer = RolUserSerializer(user)
    return Response(serializer.data, status=200)

@api_view(['PUT'])
@permission_classes([])  # Sin permisos de autenticación
def activate_user_view(request, user_id):

    try:
        user = RolUser.objects.get(id=user_id)
    except RolUser.DoesNotExist:
        return Response({"error": "Usuario no encontrado."}, status=status.HTTP_404_NOT_FOUND)

    if user.is_active:
        return Response({"message": "El usuario ya está activo."}, status=status.HTTP_400_BAD_REQUEST)

    user.is_active = True
    user.save()
    return Response({"message": "Usuario activado exitosamente."}, status=status.HTTP_200_OK)

@api_view(['PUT'])
@permission_classes([])  # Sin permisos de autenticación
def deactivate_user_view(request, user_id):
    """
    Desactiva un usuario cambiando el campo 'is_active' a False.
    """
    try:
        user = RolUser.objects.get(id=user_id)
    except RolUser.DoesNotExist:
        return Response({"error": "Usuario no encontrado."}, status=status.HTTP_404_NOT_FOUND)

    if not user.is_active:
        return Response({"message": "El usuario ya está desactivado."}, status=status.HTTP_400_BAD_REQUEST)

    user.is_active = False
    user.save()
    return Response({"message": "Usuario desactivado exitosamente."}, status=status.HTTP_200_OK)

@api_view(['GET'])
@permission_classes([AllowAny])
def get_user_detail_view(request, user_id):

    try:
        # Obtener el usuario por ID
        user = RolUser.objects.get(id=user_id)
    except RolUser.DoesNotExist:
        return Response({"error": "Usuario no encontrado."}, status=status.HTTP_404_NOT_FOUND)

    # Serializar y devolver los datos del usuario
    serializer = RolUserSerializer(user)
    return Response(serializer.data, status=status.HTTP_200_OK)

@api_view(['POST'])
@permission_classes([AllowAny])
def register_user_view(request):
    data = request.data

    username = data.get('username', '').strip()
    password = data.get('password', '').strip()
    confirm_password = data.get('confirm_password', '').strip()
    email = data.get('email', '').strip().lower()
    nombre = data.get('nombre', '').strip()
    celular = data.get('celular', '').strip()
    documento = data.get('documento', '').strip()
    rol = data.get('rol', 'coordinador')
    sedes_ids = data.get('sedes', [])  # Lista de IDs de sedes

    if not username or not email or not password or not confirm_password:
        return Response({"error": "Todos los campos son obligatorios."}, status=status.HTTP_400_BAD_REQUEST)

    if password != confirm_password:
        return Response({"error": "Las contraseñas no coinciden."}, status=status.HTTP_400_BAD_REQUEST)

    if rol != 'admin' and not sedes_ids:
        return Response({"error": "Debe seleccionar al menos una sede para coordinadores."}, status=status.HTTP_400_BAD_REQUEST)

    try:
        # Verificar que las sedes existen
        sedes = Sede.objects.filter(id__in=sedes_ids)
        if sedes.count() != len(sedes_ids):
            return Response({"error": "Una o más sedes no existen."}, status=status.HTTP_400_BAD_REQUEST)

        user = RolUser.objects.create(
            username=username,
            email=email,
            rol=rol,
            nombre=nombre,
            celular=celular,
            documento=documento,
            password=make_password(password),
            is_active=True
        )

        user.sedes.set(sedes)
        return Response({"message": "Usuario registrado exitosamente."}, status=status.HTTP_201_CREATED)

    except IntegrityError as e:
        logger.error(f"Error de integridad al registrar usuario: {str(e)}")
        return Response({"error": "El nombre de usuario o correo ya existe."}, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        logger.error(f"Error al registrar el usuario: {str(e)}")
        return Response({"error": "Ocurrió un error al registrar el usuario."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET' , 'POST'])
@permission_classes([AllowAny]) 
def reset_password_request(request):

    email = request.data.get('email', '').strip().lower()
    if not email:
        return Response({"error": "El correo es un campo obligatorio."}, status=status.HTTP_400_BAD_REQUEST)

    try:
        user = RolUser.objects.get(email=email)
    except RolUser.DoesNotExist:
        return Response({"error": "El correo no existe."}, status=status.HTTP_404_NOT_FOUND)

    try:
        subject = "Solicitud de restablecimiento de contraseña"
        message = f"""
        Estimado/a {user.username or user.email},
        Hemos recibido una solicitud para restablecer la contraseña asociada a tu cuenta.
        {settings.FRONTEND_URL}/reset-password?email={email}
        """
        send_mail(subject, message, settings.DEFAULT_FROM_EMAIL, [email])

        return Response({"message": "Revisa tu correo electrónico."}, status=status.HTTP_200_OK)

    except Exception as e:
        logger.error(f"Error al enviar el correo: {str(e)}")
        return Response({"error": "Ocurrió un error al procesar tu solicitud. Por favor, inténtalo de nuevo más tarde."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET' , 'POST'])
@permission_classes([AllowAny]) 
def reset_password(request):

    email = request.data.get('email', '').strip().lower()
    new_password = request.data.get('password', '').strip()

    if not email or not new_password:
        return Response({"error": "Correo y nueva contraseña son obligatorios."}, status=status.HTTP_400_BAD_REQUEST)

    if len(new_password) < 8:
        return Response({"error": "La contraseña debe tener al menos 8 caracteres."}, status=status.HTTP_400_BAD_REQUEST)

    try:
        user = RolUser.objects.get(email=email)
        user.password = make_password(new_password)
        user.save()
        return Response({"message": "Contraseña cambiada exitosamente."}, status=status.HTTP_200_OK)
    except RolUser.DoesNotExist:
        return Response({"error": "El correo no está registrado."}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({"error": f"Error al cambiar la contraseña: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([AllowAny]) 
def get_sedes_view(request):
    try:
        sedes = Sede.objects.all().values('id', 'nombre', 'ciudad', 'direccion')
        return Response({"sedes": list(sedes)}, status=status.HTTP_200_OK)
    except Exception as e:
        logger.error(f"Error al obtener las sedes: {str(e)}")
        return Response({"error": "Ocurrió un error al obtener las sedes."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['PUT'])
@permission_classes([AllowAny])
def edit_user_view(request, user_id):
    try:
        user = RolUser.objects.get(id=user_id)
    except RolUser.DoesNotExist:
        return Response({"error": "Usuario no encontrado."}, status=status.HTTP_404_NOT_FOUND)

    data = request.data
    sedes_ids = data.get('sedes', [])

    # Validación para coordinadores
    if user.rol != 'admin' and not sedes_ids:
        return Response({"error": "Debe seleccionar al menos una sede para coordinadores."}, status=status.HTTP_400_BAD_REQUEST)

    try:
        # Verificar que las sedes existen
        sedes = Sede.objects.filter(id__in=sedes_ids)
        if sedes.count() != len(sedes_ids):
            return Response({"error": "Una o más sedes no existen."}, status=status.HTTP_400_BAD_REQUEST)

        serializer = RolUserSerializer(user, data=data, partial=True)
        if serializer.is_valid():
            user = serializer.save()
            user.sedes.set(sedes)
            return Response({"message": "Usuario actualizado exitosamente."}, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    except Exception as e:
        logger.error(f"Error al actualizar usuario: {str(e)}")
        return Response({"error": "Ocurrió un error al actualizar el usuario."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET', 'POST'])
@permission_classes([AllowAny])
def dispositivo_view(request):
    if request.method == 'GET':
        try:
            queryset = Dispositivo.objects.select_related('posicion', 'sede')
            
            # Filtrado por sede si se proporciona
            sede_id = request.query_params.get('sede_id')
            if sede_id:
                queryset = queryset.filter(sede_id=sede_id)
            
            # Filtrado por posición si se proporciona
            posicion_id = request.query_params.get('posicion_id')
            if posicion_id:
                queryset = queryset.filter(posicion_id=posicion_id)
            
            dispositivos = queryset.all()
            serializer = DispositivoSerializer(dispositivos, many=True)
            
            return Response({
                'data': serializer.data,
                'count': len(serializer.data),
                'filters': {
                    'sede_id': sede_id,
                    'posicion_id': posicion_id
                }
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error al obtener dispositivos: {str(e)}", exc_info=True)
            return Response(
                {"error": "Error interno del servidor al obtener dispositivos"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    elif request.method == 'POST':
        serializer = DispositivoSerializer(
            data=request.data,
            context={'request': request}  # Pasar el request al serializer
        )
        
        if not serializer.is_valid():
            return Response({
                'error': 'Datos inválidos',
                'details': serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            with transaction.atomic():
                # Validación de serial único (hecha en el serializer también)
                if Dispositivo.objects.filter(serial=serializer.validated_data['serial']).exists():
                    return Response(
                        {"error": "El serial del dispositivo ya existe en el sistema"},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                
                dispositivo = serializer.save()
                
                # Respuesta con datos completos incluyendo relaciones
                full_serializer = DispositivoSerializer(dispositivo)
                return Response(
                    full_serializer.data,
                    status=status.HTTP_201_CREATED
                )
                
        except IntegrityError as e:
            logger.error(f"Error de integridad al crear dispositivo: {str(e)}")
            return Response(
                {"error": "Error de integridad de datos - posible duplicado o relación inválida"},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            logger.error(f"Error al crear dispositivo: {str(e)}", exc_info=True)
            return Response(
                {"error": "Error interno del servidor al crear dispositivo"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([AllowAny])
def dispositivo_detail_view(request, dispositivo_id):
    try:
        dispositivo = Dispositivo.objects.select_related(
            'posicion', 'sede'
        ).get(id=dispositivo_id)
    except Dispositivo.DoesNotExist:
        return Response(
            {"error": "Dispositivo no encontrado"},
            status=status.HTTP_404_NOT_FOUND
        )

    if request.method == 'GET':
        serializer = DispositivoSerializer(dispositivo)
        return Response(serializer.data)

    elif request.method == 'PUT':
        try:
            serializer = DispositivoSerializer(
                dispositivo, 
                data=request.data, 
                partial=True,
                context={'request': request}
            )
            
            if not serializer.is_valid():
                return Response({
                    'error': 'Datos de actualización inválidos',
                    'details': serializer.errors
                }, status=status.HTTP_400_BAD_REQUEST)
            
            with transaction.atomic():
                # Validación adicional de serial único
                if 'serial' in request.data:
                    new_serial = request.data['serial']
                    if Dispositivo.objects.filter(serial=new_serial).exclude(id=dispositivo_id).exists():
                        return Response(
                            {"error": "El nuevo serial ya pertenece a otro dispositivo"},
                            status=status.HTTP_400_BAD_REQUEST
                        )
                
                dispositivo_actualizado = serializer.save()
                
                # Respuesta con datos completos
                full_serializer = DispositivoSerializer(dispositivo_actualizado)
                return Response(full_serializer.data)
                
        except IntegrityError as e:
            logger.error(f"Error de integridad al actualizar dispositivo {dispositivo_id}: {str(e)}")
            return Response(
                {"error": "Error de integridad en la actualización"},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            logger.error(f"Error al actualizar dispositivo {dispositivo_id}: {str(e)}", exc_info=True)
            return Response(
                {"error": "Error interno al actualizar dispositivo"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    elif request.method == 'DELETE':
        try:
            with transaction.atomic():
                dispositivo.delete()
                return Response(
                    status=status.HTTP_204_NO_CONTENT
                )
        except Exception as e:
            logger.error(f"Error al eliminar dispositivo {dispositivo_id}: {str(e)}", exc_info=True)
            return Response(
                {"error": "Error interno al eliminar dispositivo"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

@api_view(['GET'])
@permission_classes([AllowAny])
def posiciones_por_sede_view(request, sede_id):
    try:
        # Validar que el ID sea un número entero
        try:
            sede_id_int = int(sede_id)
            if sede_id_int <= 0:
                raise ValueError("El ID debe ser positivo")
        except ValueError:
            return Response(
                {"error": "El ID de sede debe ser un número entero positivo"},
                status=status.HTTP_400_BAD_REQUEST
            )
        posiciones = Posicion.objects.filter(sede_id=sede_id_int)\
            .select_related('sede')\
            .only('id', 'nombre', 'piso', 'sede')
    
        if not posiciones.exists():
            return Response(
                {"warning": f"No se encontraron posiciones para la sede ID {sede_id}"},
                status=status.HTTP_200_OK
            )
        return Response([{
            'id': p.id,
            'nombre': p.nombre,
            'piso': p.piso,
            'sede_id': p.sede.id if p.sede else None,
            'sede_nombre': p.sede.nombre if p.sede else 'Sin sede'
        } for p in posiciones])
        
    except Exception as e:
        logger.error(f"Error al obtener posiciones para sede {sede_id}: {str(e)}", exc_info=True)
        return Response(
            {"error": "Error interno al obtener posiciones"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
@api_view(['GET', 'POST'])
@permission_classes([AllowAny])
def servicios_view(request):
    if request.method == 'GET':
        # Obtener todos los servicios
        servicios = Servicios.objects.all()
        serializer = ServiciosSerializer(servicios, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    elif request.method == 'POST':
        data = request.data
        nombre = data.get('nombre', '').strip()
        codigo_analitico = data.get('codigo_analitico', '').strip()
        sedes_ids = data.get('sedes', [])  # 🔹 Asegurar que es una lista
    
        if not nombre:
            return Response({"error": "El campo 'nombre' es obligatorio."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            servicio = Servicios.objects.create(
                nombre=nombre,
                codigo_analitico=codigo_analitico,
                color=data.get('color', '#FFFFFF')
            )
            servicio.sedes.set(sedes_ids)  # 🔹 Asignar múltiples sedes correctamente
            return Response({"message": "Servicio creado exitosamente."}, status=status.HTTP_201_CREATED)

        except Exception as e:
            logger.error(f"Error al crear el servicio: {str(e)}")
            return Response({"error": "Ocurrió un error al crear el servicio."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([AllowAny])
def servicio_detail_view(request, servicio_id):
    try:
        # Intentar obtener el servicio por su ID
        servicio = Servicios.objects.get(id=servicio_id)
    except Servicios.DoesNotExist:
        return Response({"error": "El servicio no existe."}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        # Obtener los detalles del servicio
        serializer = ServiciosSerializer(servicio)
        return Response(serializer.data, status=status.HTTP_200_OK)

    elif request.method == 'PUT':
        data = request.data
        servicio.nombre = data.get('nombre', servicio.nombre).strip()
        servicio.codigo_analitico = data.get('codigo_analitico', servicio.codigo_analitico).strip()
        servicio.color = data.get('color', servicio.color).strip() 
        sedes_ids = data.get('sedes', [])  # 🔹 Asegurar que es una lista
        servicio.sedes.set(sedes_ids)  # 🔹 Asignar correctamente la relación ManyToMany

        if not servicio.nombre:
            return Response({"error": "El campo 'nombre' es obligatorio."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            servicio.save()
            return Response({"message": "Servicio actualizado exitosamente."}, status=status.HTTP_200_OK)
        except Exception as e:
            logger.error(f"Error al actualizar el servicio: {str(e)}")
            return Response({"error": "Ocurrió un error al actualizar el servicio."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


    elif request.method == 'DELETE':
        # Eliminar el servicio
        try:
            servicio.delete()
            return Response({"message": "Servicio eliminado exitosamente."}, status=status.HTTP_204_NO_CONTENT)
        except Exception as e:
            logger.error(f"Error al eliminar el servicio: {str(e)}")
            return Response({"error": "Ocurrió un error al eliminar el servicio."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
@api_view(['GET', 'POST'])  # Asegúrate de incluir 'POST' aquí
@permission_classes([AllowAny])
def sede_view(request):
    if request.method == 'GET':
        # Listar todas las sedes
        sedes = Sede.objects.all()
        serializer = SedeSerializer(sedes, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    elif request.method == 'POST':
        # Crear una nueva sede
        data = request.data

        nombre = data.get('nombre', '').strip()
        direccion = data.get('direccion', '').strip()
        ciudad = data.get('ciudad', '').strip()

        # Validar campos obligatorios
        if not nombre or not direccion or not ciudad:
            return Response({"error": "Todos los campos son obligatorios."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            sede = Sede.objects.create(nombre=nombre, direccion=direccion, ciudad=ciudad)
            return Response({"message": "Sede creada exitosamente."}, status=status.HTTP_201_CREATED)
        except Exception as e:
            logger.error(f"Error al crear la sede: {str(e)}")
            return Response({"error": "Ocurrió un error al crear la sede."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([AllowAny])
def sede_detail_view(request, sede_id):
    try:
        # Intentar obtener la sede por su ID
        sede = Sede.objects.get(id=sede_id)
    except Sede.DoesNotExist:
        return Response({"error": "La sede no existe."}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        # Obtener los detalles de la sede
        serializer = SedeSerializer(sede)
        return Response(serializer.data, status=status.HTTP_200_OK)

    elif request.method == 'PUT':
        # Actualizar los detalles de la sede
        data = request.data

        sede.nombre = data.get('nombre', sede.nombre).strip()
        sede.direccion = data.get('direccion', sede.direccion).strip()
        sede.ciudad = data.get('ciudad', sede.ciudad).strip()

        # Validar campos obligatorios
        if not sede.nombre:
            return Response({"error": "El campo 'nombre' es obligatorio."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            # Guardar cambios
            sede.save()
            return Response({"message": "Sede actualizada exitosamente."}, status=status.HTTP_200_OK)
        except Exception as e:
            logger.error(f"Error al actualizar la sede: {str(e)}")
            return Response({"error": "Ocurrió un error al actualizar la sede."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    elif request.method == 'DELETE':
        # Eliminar la sede
        try:
            sede.delete()
            return Response({"message": "Sede eliminada exitosamente."}, status=status.HTTP_204_NO_CONTENT)
        except Exception as e:
            logger.error(f"Error al eliminar la sede: {str(e)}")
            return Response({"error": "Ocurrió un error al eliminar la sede."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
# vistas para las posiciones
@api_view(['GET'])
@permission_classes([AllowAny])
def posiciones_view(request):
    posiciones = Posicion.objects.all().prefetch_related('dispositivos')
    serializer = PosicionSerializer(posiciones, many=True)

    return Response(serializer.data, status=200)

@api_view(['GET'])
@permission_classes([]) 
def dashboard_data(request):
    sede_id = request.query_params.get('sede')
    
    if sede_id == "null":
        dispositivos = Dispositivo.objects.filter(sede__isnull=True)
    elif sede_id:
        try:
            sede_id = int(sede_id)
            dispositivos = Dispositivo.objects.filter(sede_id=sede_id)
        except (ValueError, TypeError):
            return Response({"error": "ID de sede inválido"}, status=400)
    else:
        dispositivos = Dispositivo.objects.all()

    total_dispositivos = dispositivos.count()
    dispositivos_en_uso = dispositivos.filter(estado_uso='EN_USO').count()
    dispositivos_buen_estado = dispositivos.filter(estado='BUENO').count()
    dispositivos_disponibles = dispositivos.filter(estado_uso='DISPONIBLE').count()
    dispositivos_en_reparacion = dispositivos.filter(estado='REPARAR').count()
    dispositivos_perdidos = dispositivos.filter(estado='PERDIDO').count()
    dispositivos_mal_estado = dispositivos.filter(estado='MALO').count()
    dispositivos_inhabilitados = dispositivos.filter(estado_uso='INHABILITADO').count()

    cardsData = [
        {
            "title": "Total dispositivos",
            "value": total_dispositivos,
            "date": "Actualizado hoy"
        },
        {
            "title": "Dispositivos en uso",
            "value": dispositivos_en_uso,
            "date": "Actualizado hoy"
        },
        {
            "title": "Buen estado",
            "value": dispositivos_buen_estado,
            "date": "Actualizado hoy"
        },
        {
            "title": "Dispositivos disponibles",
            "value": dispositivos_disponibles,
            "date": "Actualizado hoy"
        },
        {
            "title": "En reparación",
            "value": dispositivos_en_reparacion,
            "date": "Actualizado hoy"
        },
        {
            "title": "Perdidos/robados",
            "value": dispositivos_perdidos,
            "date": "Actualizado hoy"
        },
        {
            "title": "Mal estado",
            "value": dispositivos_mal_estado,
            "date": "Actualizado hoy"
        },
        {
            "title": "Inhabilitados",
            "value": dispositivos_inhabilitados,
            "date": "Actualizado hoy"
        }
    ]

    return Response({"cardsData": cardsData})

def encontrar_servicio_mas_parecido(nombre_servicio):
    if not nombre_servicio:
        return None
    servicios = Servicios.objects.values_list('nombre', 'codigo_analitico')
    if not servicios.exists():
        return None
    mejor_coincidencia, puntuacion = process.extractOne(nombre_servicio, [s[0] for s in servicios])
    if puntuacion >= 80:
        return next((s for s in servicios if s[0] == mejor_coincidencia), None)
    return None

@api_view(['POST'])
@parser_classes([MultiPartParser])
@permission_classes([])
def importar_dispositivos(request):
    file = request.FILES.get('file')

    if not file:
        return JsonResponse({'error': 'No se ha subido ningún archivo'}, status=400)

    errores = []
    dispositivos = []

    try:
        df = pd.read_excel(file)

        if df.empty:
            return JsonResponse({'error': 'El archivo está vacío'}, status=400)

        logger.info(f"Primeras filas del DataFrame: {df.head()}")

        for index, row in df.iterrows():
            try:
                tipo = str(row.get("Tipo Dispositivo", "")).strip()
                serial = str(row.get("Serial", "")).strip()

                if not tipo:
                    raise ValueError("Tipo de dispositivo es obligatorio")
                if not serial:
                    raise ValueError("Serial es obligatorio")

                servicio_nombre = str(row.get("Servicio", "")).strip()
                servicio = encontrar_servicio_mas_parecido(servicio_nombre)

                if not servicio:
                    raise ValueError(f"Servicio '{servicio_nombre}' no encontrado o no coincide suficientemente")

                codigo_analitico = servicio[1]
                sede = Sede.objects.filter(servicios__codigo_analitico=codigo_analitico).first()

                if not sede:
                    raise ValueError(f"Sede con código analítico '{codigo_analitico}' no encontrada")

                piso = str(row.get("Piso", "")).strip()
                posicion_valor = str(row.get("Posición", "")).strip()

                if not piso or not posicion_valor:
                    raise ValueError("Piso y posición son obligatorios")

                posicion_obj = Posicion.objects.filter(piso=piso, nombre=posicion_valor, sede=sede).first()

                if not posicion_obj:
                    raise ValueError(f"Posición '{piso}-{posicion_valor}' no encontrada en la sede '{sede.nombre}'")

                dispositivo = Dispositivo(
                    tipo=tipo,
                    marca=str(row.get("Fabricante", "")).strip(),
                    modelo=str(row.get("Modelo", "")).strip(),
                    serial=serial,
                    estado=str(row.get("Estado", "")).strip(),
                    sede=sede,
                    posicion=posicion_obj,
                    ubicacion=str(row.get("Ubicación", "")).strip(),
                    placa_cu=str(row.get("CU", "")).strip(),
                    sistema_operativo=str(row.get("Sistema Operativo", "")).strip(),
                    procesador=str(row.get("Procesador", "")).strip(),
                    capacidad_disco_duro=str(row.get("Disco Duro", "")).strip(),
                    capacidad_memoria_ram=str(row.get("Memoria RAM", "")).strip(),
                    proveedor=str(row.get("Proveedor", "")).strip(),
                    estado_propiedad=str(row.get("Estado Proveedor", "")).strip(),
                    razon_social=str(row.get("Razón Social", "")).strip(),
                    regimen=str(row.get("Regimen", "")).strip(),
                )
                dispositivos.append(dispositivo)

            except ValueError as ve:
                error_msg = f"Error en fila {index + 2}: {str(ve)}"
                logger.error(error_msg)
                errores.append({
                    'fila': index + 2,
                    'error': str(ve),
                    'datos': row.to_dict()
                })
            except Exception as e:
                error_msg = f"Error inesperado en fila {index + 2}: {str(e)}"
                logger.error(error_msg)
                errores.append({
                    'fila': index + 2,
                    'error': f"Error inesperado: {str(e)}",
                    'datos': row.to_dict()
                })

        if dispositivos:
            try:
                with transaction.atomic():
                    Dispositivo.objects.bulk_create(dispositivos, ignore_conflicts=True)
            except Exception as e:
                logger.error(f"Error al guardar en la BD: {str(e)}")
                return JsonResponse({'error': f"Error al guardar en la BD: {str(e)}"}, status=500)

        return JsonResponse({
            'message': f'{len(dispositivos)} dispositivos importados correctamente',
            'errores': errores
        }, status=201 if not errores else 207)

    except Exception as e:
        logger.error(f"Error inesperado: {str(e)}")
        return JsonResponse({'error': f"Error inesperado: {str(e)}"}, status=500)

@csrf_exempt
def subir_excel(request):
    if request.method == "POST" and request.FILES.get("archivo"):
        archivo = request.FILES["archivo"]
        return importar_excel(archivo)
    return JsonResponse({"error": "No se recibió ningún archivo"}, status=400)

def descargar_excel(request):
    return exportar_excel()

class PosicionListCreateView(generics.ListCreateAPIView):
    queryset = Posicion.objects.all()
    serializer_class = PosicionSerializer
    permission_classes = [AllowAny]

    def create(self, request, *args, **kwargs):
        data = request.data

        # Verificar si ya existe
        if "id" in data and Posicion.objects.filter(id=data["id"]).exists():
            return Response({'error': 'La posici\u00f3n ya existe'}, status=status.HTTP_400_BAD_REQUEST)

        # Si no se proporciona un ID, generarlo autom\u00e1ticamente
        if "id" not in data:
            data["id"] = f"pos_{int(time.time())}"  # Genera un ID \u00fanico basado en el tiempo

        # Validar y guardar
        serializer = self.get_serializer(data=data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class PosicionRetrieveUpdateDestroyView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Posicion.objects.all()
    serializer_class = PosicionSerializer
    lookup_field = 'id'
    permission_classes = [AllowAny]

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        if not instance:
            return Response({"error": "Posici\u00f3n no encontrada"}, status=status.HTTP_404_NOT_FOUND)

        # Validaci\u00f3n de datos
        serializer = self.get_serializer(instance, data=request.data, partial=True)
        if serializer.is_valid():
            try:
                serializer.save()  # Guarda los datos validados
                return Response(serializer.data, status=status.HTTP_200_OK)
            except Exception as e:
                return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if not instance:
            return Response({"error": "Posici\u00f3n no encontrada"}, status=status.HTTP_404_NOT_FOUND)

        instance.delete()
        return Response({"message": "Posici\u00f3n eliminada correctamente"}, status=status.HTTP_204_NO_CONTENT)

@api_view(['GET'])
@permission_classes([AllowAny])
def get_colores_pisos(request):
    return Response({
        "colores": dict(Posicion.COLORES),
        "pisos": dict(Posicion.PISOS),
    })

class HistorialViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [AllowAny]
    queryset = Historial.objects.all().select_related('dispositivo', 'usuario')
    serializer_class = HistorialSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['tipo_cambio']
    search_fields = [
        'dispositivo__serial', 
        'dispositivo__modelo',
        'dispositivo__marca',
        'dispositivo__placa_cu',
        'usuario__nombre',
        'usuario__username',
        'usuario__email'
    ]
    ordering_fields = ['fecha_modificacion', 'fecha_creacion']
    ordering = ['-fecha_modificacion']  # Orden por defecto

    def get_queryset(self):
        queryset = super().get_queryset()
        
        # Filtros adicionales
        fecha_inicio = self.request.query_params.get('fecha_inicio')
        fecha_fin = self.request.query_params.get('fecha_fin')
        dispositivo_id = self.request.query_params.get('dispositivo_id')
        tipo_cambio = self.request.query_params.get('tipo_cambio')
        try:
            if fecha_inicio:
                fecha_inicio_dt = datetime.strptime(fecha_inicio, '%Y-%m-%d')
                queryset = queryset.filter(fecha_modificacion__gte=fecha_inicio_dt)
                
            if fecha_fin:
                fecha_fin_dt = datetime.strptime(fecha_fin, '%Y-%m-%d') + timedelta(days=1)
                queryset = queryset.filter(fecha_modificacion__lte=fecha_fin_dt)
        except ValueError as e:
            pass
        if dispositivo_id:
            if dispositivo_id.isdigit():
                queryset = queryset.filter(dispositivo__id=dispositivo_id)
            else:
                queryset = queryset.filter(
                    Q(dispositivo__serial__icontains=dispositivo_id) |
                    Q(dispositivo__placa_cu__icontains=dispositivo_id) |
                    Q(dispositivo__modelo__icontains=dispositivo_id) |
                    Q(dispositivo__marca__icontains=dispositivo_id)
                )
                
        if tipo_cambio:
            queryset = queryset.filter(tipo_cambio=tipo_cambio)
            
        return queryset

    @action(detail=False, methods=['get'])
    def opciones_filtro(self, request):
        dispositivos = Dispositivo.objects.all().order_by('-id')[:100]
        
        return Response({
            'tipos_cambio': dict(Historial.TipoCambio.choices),
            'dispositivos': [
                {
                    'id': d.id,
                    'marca': d.marca,
                    'modelo': d.modelo,
                    'serial': d.serial,
                    'placa_cu': d.placa_cu
                } 
                for d in dispositivos
            ],
            'ordering_fields': self.ordering_fields,
            'search_fields': self.search_fields
        })


@api_view(['POST'])
@permission_classes([AllowAny])
def refresh_token_view(request):
    try:
        refresh_token = request.data.get('refresh')
        if not refresh_token:
            return Response({'error': 'Refresh token requerido'}, status=400)
            
        refresh = RefreshToken(refresh_token)
        new_access = str(refresh.access_token)
        
        return Response({
            'access': new_access,
            'refresh': str(refresh)
        }, status=200)
        
    except TokenError as e:
        return Response({'error': str(e)}, status=401)

        
@api_view(['GET'])
@permission_classes([AllowAny])
def dispositivos_por_sede(request):
    try:
        # Consulta corregida - usando 'dispositivos' en lugar de 'dispositivo'
        sedes_con_dispositivos = Sede.objects.annotate(
            total_dispositivos=Count('dispositivos')  # ¡Cambio importante aquí!
        ).values('nombre', 'total_dispositivos').order_by('nombre')

        response = Response({
            'success': True,
            'data': list(sedes_con_dispositivos)
        }, status=200)

        # Configuración CORS
        response["Access-Control-Allow-Origin"] = "http://localhost:3000"
        response["Access-Control-Allow-Methods"] = "GET, OPTIONS"
        
        return response

    except Exception as e:
        logger.error(f"Error en dispositivos_por_sede: {str(e)}", exc_info=True)
        return Response({
            'success': False,
            'error': "Error al procesar la solicitud"
        }, status=500)
        
def dispositivo_choices(request):
    return JsonResponse({
        'TIPOS_DISPOSITIVOS': Dispositivo.TIPOS_DISPOSITIVOS,
        'FABRICANTES': Dispositivo.FABRICANTES,
        'ESTADO_DISPOSITIVO': Dispositivo.ESTADO_DISPOSITIVO,
        'RAZONES_SOCIALES': Dispositivo.RAZONES_SOCIALES,
        'SISTEMAS_OPERATIVOS': Dispositivo.SISTEMAS_OPERATIVOS,
        'PROCESADORES': Dispositivo.PROCESADORES,
        'UBICACIONES': Dispositivo.UBICACIONES,
        'ESTADOS_PROPIEDAD': Dispositivo.ESTADOS_PROPIEDAD,
        'CAPACIDADES_DISCO_DURO': Dispositivo.CAPACIDADES_DISCO_DURO,
        'CAPACIDADES_MEMORIA_RAM': Dispositivo.CAPACIDADES_MEMORIA_RAM,
        'ESTADO_USO': Dispositivo.ESTADO_USO,
    })
    
    
    
    
# vistas para los movimientos
class MovimientoViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [AllowAny]
    queryset = Movimiento.objects.all().select_related('dispositivo', 'encargado')
    serializer_class = MovimientoSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['ubicacion_origen', 'ubicacion_destino']
    search_fields = [
        'dispositivo__serial', 
        'dispositivo__modelo',
        'dispositivo__marca',
        'dispositivo__placa_cu',
        'encargado__nombre',
        'encargado__username',
        'encargado__email',
        'observacion'
    ]
    ordering_fields = ['fecha_movimiento']
    ordering = ['-fecha_movimiento']  # Orden por defecto

    def get_queryset(self):
        queryset = super().get_queryset()
        
        # Filtros adicionales
        fecha_inicio = self.request.query_params.get('fecha_inicio')
        fecha_fin = self.request.query_params.get('fecha_fin')
        dispositivo_id = self.request.query_params.get('dispositivo_id')
        
        try:
            if fecha_inicio:
                fecha_inicio_dt = datetime.strptime(fecha_inicio, '%Y-%m-%d')
                queryset = queryset.filter(fecha_movimiento__gte=fecha_inicio_dt)
                
            if fecha_fin:
                fecha_fin_dt = datetime.strptime(fecha_fin, '%Y-%m-%d') + timedelta(days=1)
                queryset = queryset.filter(fecha_movimiento__lte=fecha_fin_dt)
        except ValueError as e:
            pass
            
        if dispositivo_id:
            if dispositivo_id.isdigit():
                queryset = queryset.filter(dispositivo__id=dispositivo_id)
            else:
                queryset = queryset.filter(
                    Q(dispositivo__serial__icontains=dispositivo_id) |
                    Q(dispositivo__placa_cu__icontains=dispositivo_id) |
                    Q(dispositivo__modelo__icontains=dispositivo_id) |
                    Q(dispositivo__marca__icontains=dispositivo_id)
                )
                
        return queryset

    @action(detail=False, methods=['get'])
    def opciones_filtro(self, request):
        dispositivos = Dispositivo.objects.all().order_by('-id')[:100]
        usuarios = RolUser.objects.filter(is_active=True).order_by('-id')[:50]
        
        return Response({
            'ubicaciones': dict(Movimiento.UBICACIONES),
            'dispositivos': [
                {
                    'id': d.id,
                    'marca': d.marca,
                    'modelo': d.modelo,
                    'serial': d.serial,
                    'placa_cu': d.placa_cu
                } 
                for d in dispositivos
            ],
            'usuarios': [
                {
                    'id': u.id,
                    'nombre': u.get_full_name() or u.username,
                    'email': u.email,
                    'rol': u.rol
                }
                for u in usuarios
            ],
            'ordering_fields': self.ordering_fields,
            'search_fields': self.search_fields
        })