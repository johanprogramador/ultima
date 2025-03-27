from django.contrib.auth.hashers import make_password # type: ignore
from django.shortcuts import get_object_or_404 # type: ignore
from django.core.mail import send_mail # type: ignore
from django.conf import settings # type: ignore
from django.contrib.auth.models import User
from django.shortcuts import render
from django.views.decorators.cache import never_cache
from django.contrib.auth.decorators import login_required # type: ignore
from rest_framework import viewsets # type: ignore
from rest_framework.permissions import IsAuthenticated # type: ignore
from rest_framework.decorators import api_view, permission_classes # type: ignore
from rest_framework import status# type: ignore
from rest_framework.permissions import AllowAny
from rest_framework.response import Response # type: ignore
from .models import RolUser, Sede , Dispositivo , Servicios ,Posicion
from .serializers import RolUserSerializer , ServiciosSerializer ,  LoginSerializer , DispositivoSerializer , SedeSerializer, PosicionSerializer
import logging
logger = logging.getLogger(__name__)
from django.views.decorators.cache import cache_control
from rest_framework.decorators import api_view, authentication_classes, permission_classes ,  parser_classes
from rest_framework.authentication import TokenAuthentication
from rest_framework.permissions import IsAuthenticated
from django.http import JsonResponse
import jwt
from rest_framework_simplejwt.tokens import AccessToken
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate
from rest_framework.parsers import MultiPartParser
import pandas as pd # type: ignore
from fuzzywuzzy import process # type: ignore




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
    """
    Obtiene la lista de usuarios.
    """
    # Obtén los usuarios de la base de datos (en tu caso RolUser)
    users = RolUser.objects.all()
    
    # Serializa la lista de usuarios
    serializer = RolUserSerializer(users, many=True)
    
    # Devuelve la lista de usuarios serializada
    return Response(serializer.data)

class RolUserViewSet(viewsets.ModelViewSet):
    queryset = RolUser.objects.all()
    serializer_class = RolUserSerializer

@api_view(["POST"])
@permission_classes([AllowAny])  
def login_user(request):
    """Autenticación de usuario y generación de token JWT."""
    
    username = request.data.get("username")
    password = request.data.get("password")

    if not username or not password:
        return Response({"error": "Faltan credenciales"}, status=status.HTTP_400_BAD_REQUEST)

    user = authenticate(username=username, password=password)
    
    if user:
        refresh = RefreshToken.for_user(user)
        return Response({
            "access": str(refresh.access_token),
            "refresh": str(refresh),
            "username": user.username
        }, status=status.HTTP_200_OK)

    return Response({"error": "Credenciales incorrectas"}, status=status.HTTP_401_UNAUTHORIZED)

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
    """
    Activa un usuario cambiando el campo 'is_active' a True.
    """
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
    """
    Devuelve los detalles de un usuario específico.
    """
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
    """
    Registra un nuevo usuario con validaciones.
    """
    data = request.data

    username = data.get('username', '').strip()
    password = data.get('password', '').strip()
    confirm_password = data.get('confirm_password', '').strip()
    email = data.get('email', '').strip().lower()
    nombre = data.get('nombre', '').strip()
    celular = data.get('celular', '').strip()
    documento = data.get('documento', '').strip()
    rol = data.get('rol', 'coordinador')
    sedes_ids = data.get('sedes', [])

    if not username or not email or not password or not confirm_password:
        return Response({"error": "Todos los campos son obligatorios."}, status=status.HTTP_400_BAD_REQUEST)

    if password != confirm_password:
        return Response({"error": "Las contraseñas no coinciden."}, status=status.HTTP_400_BAD_REQUEST)

    if RolUser.objects.filter(email=email).exists():
        return Response({"error": "Este correo electrónico ya está registrado."}, status=status.HTTP_400_BAD_REQUEST)

    try:
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

        sedes = Sede.objects.filter(id__in=sedes_ids)
        user.sedes.set(sedes)
        user.save()

        return Response({"message": "Usuario registrado exitosamente."}, status=status.HTTP_201_CREATED)

    except Exception as e:
        logger.error(f"Error al registrar el usuario: {str(e)}")
        return Response({"error": "Ocurrió un error al registrar el usuario."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["POST"])
@permission_classes([]) 
def validate_token(request):
    """Valida si el token es correcto y aún es válido."""
    auth_header = request.headers.get("Authorization")
    if not auth_header or "Bearer" not in auth_header:
        return Response({"error": "Token no proporcionado"}, status=status.HTTP_401_UNAUTHORIZED)

    try:
        token = auth_header.split(" ")[1]  # Extraer token de la cabecera
        AccessToken(token)  # Decodificar y validar token
        return Response({"message": "Token válido"}, status=status.HTTP_200_OK)
    except Exception:
        return Response({"error": "Token inválido o expirado"}, status=status.HTTP_401_UNAUTHORIZED)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def obtener_datos_protegidos(request):
    return Response({"message": "Datos protegidos disponibles solo para usuarios autenticados"})

@api_view(['GET' , 'POST'])
def reset_password_request(request):
    """
    Solicita el restablecimiento de contraseña.
    """
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
def reset_password(request):
    """
    Restablece la contraseña del usuario.
    """
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
@permission_classes([]) 
def get_sedes_view(request):
    """
    Devuelve una lista de sedes disponibles.
    """
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

    # Serializar y actualizar datos
    serializer = RolUserSerializer(user, data=request.data, partial=True)
    if serializer.is_valid():
        serializer.save()
        return Response({"message": "Usuario editado exitosamente."}, status=status.HTTP_200_OK)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)



@api_view(['GET', 'POST'])
@permission_classes([AllowAny])
def dispositivo_view(request):
    """
    Maneja la creación y listado de dispositivos.
    """
    if request.method == 'GET':
        # Obtener todos los dispositivos
        dispositivos = Dispositivo.objects.all()
        serializer = DispositivoSerializer(dispositivos, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    elif request.method == 'POST':
        # Validar y crear un nuevo dispositivo
        data = request.data

        # Obtener los campos del formulario
        tipo = data.get('tipo', '').strip()
        marca = data.get('marca', '').strip()
        modelo = data.get('modelo', '').strip()
        serial = data.get('serial', '').strip()
        estado = data.get('estado', '').strip()
        capacidad_memoria_ram = data.get('capacidad_memoria_ram', '').strip()
        capacidad_disco_duro = data.get('capacidad_disco_duro', '').strip()
        tipo_disco_duro = data.get('tipo_disco_duro', '').strip()
        tipo_memoria_ram = data.get('tipo_memoria_ram', '').strip()
        ubicacion = data.get('ubicacion', '').strip()
        razon_social = data.get('razon_social', '').strip()
        regimen = data.get('regimen', '').strip()
        placa_cu = data.get('placa_cu', '').strip()
        posicion_id = data.get('posicion', None)
        sede_id = data.get('sede', None)
        procesador = data.get('procesador', '').strip()
        sistema_operativo = data.get('sistema_operativo', '').strip()
        proveedor = data.get('proveedor', '').strip()

        # Validaciones básicas
        if not tipo or not marca or not modelo or not serial:
            return Response({"error": "Los campos tipo, marca, modelo y serial son obligatorios."}, 
                            status=status.HTTP_400_BAD_REQUEST)

        if Dispositivo.objects.filter(serial=serial).exists():
            return Response({"error": "Ya existe un dispositivo con este número de serial."}, 
                            status=status.HTTP_400_BAD_REQUEST)

        try:
            # Crear el dispositivo
            dispositivo = Dispositivo.objects.create(
                tipo=tipo,
                marca=marca,
                modelo=modelo,
                serial=serial,
                estado=estado,
                capacidad_memoria_ram=capacidad_memoria_ram,
                capacidad_disco_duro=capacidad_disco_duro,
                tipo_disco_duro=tipo_disco_duro,
                tipo_memoria_ram=tipo_memoria_ram,
                ubicacion=ubicacion,
                razon_social=razon_social,
                regimen=regimen,
                placa_cu=placa_cu,
                posicion_id=posicion_id,
                sede_id=sede_id,
                procesador=procesador,
                sistema_operativo=sistema_operativo,
                proveedor=proveedor
                
            )
            return Response({"message": "Dispositivo registrado exitosamente."}, status=status.HTTP_201_CREATED)

        except Exception as e:
            logger.error(f"Error al registrar el dispositivo: {str(e)}")
            return Response({"error": "Ocurrió un error al registrar el dispositivo."}, 
                            status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([AllowAny])
def dispositivo_detail_view(request, dispositivo_id):
    """
    Maneja la obtención, actualización y eliminación de un dispositivo específico.
    """
    try:
        # Intentar obtener el dispositivo por su ID
        dispositivo = Dispositivo.objects.get(id=dispositivo_id)
    except Dispositivo.DoesNotExist:
        return Response({"error": "El dispositivo no existe."}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        # Obtener los detalles del dispositivo
        serializer = DispositivoSerializer(dispositivo)
        return Response(serializer.data, status=status.HTTP_200_OK)

    elif request.method == 'PUT':
    # Usar el serializador para actualizar
        serializer = DispositivoSerializer(dispositivo, data=request.data, partial=True)
    
        if serializer.is_valid():
            serializer.save()
            return Response({"message": "Dispositivo actualizado exitosamente."}, status=status.HTTP_200_OK)
        else:
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    elif request.method == 'DELETE':
        # Eliminar el dispositivo
        try:
            dispositivo.delete()
            return Response({"message": "Dispositivo eliminado exitosamente."}, status=status.HTTP_204_NO_CONTENT)
        except Exception as e:
            logger.error(f"Error al eliminar el dispositivo: {str(e)}")
            return Response({"error": "Ocurrió un error al eliminar el dispositivo."}, 
                            status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
            
            
@api_view(['GET', 'POST'])
@permission_classes([AllowAny])
def servicios_view(request):
    """
    Maneja la creación y listado de servicios.
    """

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
    """
    Maneja la obtención, actualización y eliminación de un servicio específico.
    """
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
    """
    Maneja la creación y listado de sedes.
    """
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
    """
    Maneja la obtención, actualización y eliminación de una sede específica.
    """
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
    # Ejemplo: contar dispositivos
    total_dispositivos = Dispositivo.objects.count()
    dispositivos_en_uso = Dispositivo.objects.filter(usuario_asignado__isnull=True).count()
    dispositivos_disponibles = total_dispositivos - dispositivos_en_uso

    # Ejemplo: Datos para tarjetas
    cardsData = [
        {
            "title": "Total dispositivos",
            "value": str(total_dispositivos),
            "date": "Hoy"  # Puedes formatear la fecha o agregar más info
        },
        {
            "title": "Dispositivos en uso",
            "value": str(dispositivos_en_uso),
            "date": "Hoy"
        },
        {
            "title": "Dispositivos disponibles",
            "value": str(dispositivos_disponibles),
            "date": "Hoy"
        }
    ]

    # Aquí podrías agregar más consultas para datos de gráficas o estadísticas.
    # Por ejemplo, si tienes un modelo de Estadísticas, podrías consultar Series de datos para la gráfica.
    # De momento, devolveremos solo las cards.
    data = {
        "cardsData": cardsData,
        # "quarterlyData": [...]  # Puedes agregar otros datos de gráficos aquí
    }
    return Response(data)

from django.core.exceptions import ObjectDoesNotExist
from thefuzz import process # type: ignore

from django.core.exceptions import ObjectDoesNotExist
from thefuzz import process  # type: ignore
from rest_framework.decorators import api_view, parser_classes, permission_classes
from rest_framework.parsers import MultiPartParser
from django.http import JsonResponse
import pandas as pd # type: ignore
from django.db import transaction
import logging

logger = logging.getLogger(__name__)

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






from .utils import importar_excel, exportar_excel
from django.views.decorators.csrf import csrf_exempt


@csrf_exempt
def subir_excel(request):
    if request.method == "POST" and request.FILES.get("archivo"):
        archivo = request.FILES["archivo"]
        return importar_excel(archivo)
    return JsonResponse({"error": "No se recibió ningún archivo"}, status=400)

def descargar_excel(request):
    return exportar_excel()


from rest_framework import status, generics # type: ignore
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from rest_framework.decorators import api_view, permission_classes
import time

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
