from rest_framework import serializers # type: ignore
from django.contrib.auth import authenticate # type: ignore
from django.contrib.auth.hashers import make_password # type: ignore
from django.utils.translation import gettext_lazy as _ # type: ignore
from django.db import transaction # type: ignore
from .models import RolUser, Sede, Dispositivo, Servicios, Posicion, Historial, Movimiento

class RolUserSerializer(serializers.ModelSerializer):
    sedes = serializers.PrimaryKeyRelatedField(queryset=Sede.objects.all(), many=True, required=False)
    password = serializers.CharField(write_only=True, required=False, min_length=8)

    class Meta:
        model = RolUser
        fields = ['id', 'username', 'nombre', 'email', 'rol', 'celular', 'documento', 'sedes', 'password', 'is_active']

    def validate_email(self, value):
        return value.lower().strip()

    def validate_celular(self, value):
        import re
        if value and not re.match(r'^\+?\d{7,15}$', value):
            raise serializers.ValidationError(
                "El número de celular debe ser un número válido con 7 a 15 dígitos, y puede incluir un signo '+' al principio."
            )
        return value

    def create(self, validated_data):
        password = validated_data.pop('password', None)
        user = super().create(validated_data)
        if password:
            user.password = make_password(password)
            user.save()
        return user

    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)
        user = super().update(instance, validated_data)
        if password:
            user.password = make_password(password)
            user.save()
        return user

class LoginSerializer(serializers.Serializer):
    username = serializers.CharField(required=True)
    password = serializers.CharField(required=True, write_only=True)

    def validate(self, data):
        username = data.get('username')
        password = data.get('password')

        user = authenticate(username=username, password=password)
        if not user:
            raise serializers.ValidationError(_('Credenciales inválidas'))
        if not user.is_active:
            raise serializers.ValidationError(_('La cuenta está inactiva.'))
        data['user'] = user
        return data

class DispositivoSerializer(serializers.ModelSerializer):
    sede = serializers.PrimaryKeyRelatedField(
        queryset=Sede.objects.all(), 
        required=False,
        allow_null=True
    )
    nombre_sede = serializers.SerializerMethodField()
    posicion = serializers.PrimaryKeyRelatedField(
        queryset=Posicion.objects.all(), 
        required=False,
        allow_null=True
    )
    tipo_display = serializers.CharField(source='get_tipo_display', read_only=True)
    estado_display = serializers.CharField(source='get_estado_display', read_only=True)
    marca_display = serializers.CharField(source='get_marca_display', read_only=True)
    sistema_operativo_display = serializers.CharField(source='get_sistema_operativo_display', read_only=True)
    is_operativo = serializers.SerializerMethodField()

    TIPOS_CON_REQUISITOS = ['COMPUTADOR', 'PORTATIL', 'DESKTOP', 'TODO_EN_UNO']
    ESTADOS_INVALIDOS = ['MALO', 'PERDIDO_ROBADO', 'PENDIENTE_BAJA']

    class Meta:
        model = Dispositivo
        fields = [
            'id', 'tipo', 'tipo_display', 'estado', 'estado_display', 'marca', 'marca_display',
            'razon_social', 'regimen', 'modelo', 'serial', 'placa_cu', 'posicion', 
            'sede', 'nombre_sede', 'piso', 'capacidad_disco_duro', 'capacidad_memoria_ram',
            'ubicacion', 'sistema_operativo', 'sistema_operativo_display', 'procesador', 
            'proveedor', 'estado_propiedad', 'estado_uso', 'observaciones', 'is_operativo'
        ]
        extra_kwargs = {
            'serial': {'required': True, 'allow_blank': False},
            'modelo': {'required': True, 'allow_blank': False},
            'tipo': {'required': True},
            'marca': {'required': True},
            'estado': {'required': True},
            'placa_cu': {'allow_blank': True},
            'observaciones': {'allow_blank': True, 'required': False}
        }

    def get_nombre_sede(self, obj):
        return obj.sede.nombre if obj.sede else None

    def get_is_operativo(self, obj):
        return obj.is_operativo()

    def validate(self, data):
        request = self.context.get('request')
        instance = getattr(self, 'instance', None)
        
        # Validaciones básicas
        if request and request.method == 'POST' and 'serial' in data:
            if Dispositivo.objects.filter(serial=data['serial']).exists():
                raise serializers.ValidationError({'serial': 'Ya existe un dispositivo con este serial'})

        if 'placa_cu' in data and data['placa_cu']:
            queryset = Dispositivo.objects.filter(placa_cu=data['placa_cu'])
            if instance:
                queryset = queryset.exclude(pk=instance.pk)
            if queryset.exists():
                raise serializers.ValidationError({'placa_cu': 'Ya existe un dispositivo con esta placa CU'})

        # Validaciones de posición y sede
        posicion = data.get('posicion', instance.posicion if instance else None)
        sede = data.get('sede', instance.sede if instance else None)
        
        if posicion and not sede:
            raise serializers.ValidationError({'sede': 'Debe especificar una sede si asigna una posición'})
            
        if posicion and sede and posicion.sede != sede:
            raise serializers.ValidationError({
                'posicion': f'La posición seleccionada pertenece a la sede {posicion.sede.nombre}, no coincide con la sede del dispositivo {sede.nombre}'
            })

        # Validar límite de dispositivos en posición
        if posicion:
            dispositivos_count = posicion.dispositivos_relacionados.count()
            if not instance or (instance and instance.posicion != posicion):
                if dispositivos_count >= Posicion.MAX_DISPOSITIVOS:
                    raise serializers.ValidationError({
                        'posicion': f'Esta posición ya tiene el máximo de {Posicion.MAX_DISPOSITIVOS} dispositivos'
                    })

        # Validaciones específicas del dispositivo
        dispositivo_tipo = data.get('tipo', getattr(instance, 'tipo', None))
        if dispositivo_tipo in self.TIPOS_CON_REQUISITOS:
            required_fields = {
                'capacidad_memoria_ram': 'Capacidad de RAM requerida para este dispositivo',
                'sistema_operativo': 'Sistema operativo requerido para este dispositivo',
                'procesador': 'Procesador requerido para este dispositivo'
            }
            for field, error_msg in required_fields.items():
                if not data.get(field) and not getattr(instance, field, None):
                    raise serializers.ValidationError({field: error_msg})

        if data.get('estado') in self.ESTADOS_INVALIDOS:
            if data.get('estado_uso') and data.get('estado_uso') != 'INHABILITADO':
                raise serializers.ValidationError({
                    'estado_uso': 'El estado de uso debe ser INHABILITADO cuando el estado del dispositivo es inválido.'
                })
            data['estado_uso'] = 'INHABILITADO'

        return data

    def create(self, validated_data):
        request = self.context.get('request')
        user = request.user if request else None
        
        try:
            with transaction.atomic():
                posicion = validated_data.get('posicion')
                if posicion and posicion.dispositivos_relacionados.count() >= Posicion.MAX_DISPOSITIVOS:
                    raise serializers.ValidationError({
                        'posicion': f'No se puede agregar más dispositivos. Límite de {Posicion.MAX_DISPOSITIVOS} alcanzado'
                    })
                
                if posicion:
                    validated_data['piso'] = posicion.piso
                
                dispositivo = super().create(validated_data)
                
                if posicion:
                    posicion.dispositivos.add(dispositivo)
                    Movimiento.objects.create(
                        dispositivo=dispositivo,
                        posicion_origen=None,
                        posicion_destino=posicion,
                        encargado=user,
                        sede=dispositivo.sede,
                        observacion="Creación de dispositivo con posición"
                    )
                
                return dispositivo
        except Exception as e:
            raise serializers.ValidationError({'non_field_errors': f'Error al crear el dispositivo: {str(e)}'})

    def update(self, instance, validated_data):
        request = self.context.get('request')
        user = request.user if request else None
        posicion_anterior = instance.posicion
        nueva_posicion = validated_data.get('posicion')
        
        try:
            with transaction.atomic():
                # 1. Verificar coherencia de sedes si hay nueva posición
                if nueva_posicion and 'sede' not in validated_data:
                    if instance.sede != nueva_posicion.sede:
                        raise serializers.ValidationError({
                            'posicion': f'La posición pertenece a otra sede ({nueva_posicion.sede.nombre}). Actualice también la sede del dispositivo.'
                        })
                
                # 2. Verificar límite en nueva posición
                if nueva_posicion and nueva_posicion != posicion_anterior:
                    if nueva_posicion.dispositivos.count() >= Posicion.MAX_DISPOSITIVOS:
                        raise serializers.ValidationError({
                            'posicion': f'No se puede mover. La posición ya tiene {Posicion.MAX_DISPOSITIVOS} dispositivos.'
                        })
                
                # 3. Remover de TODAS las posiciones anteriores (por si estaba en múltiples)
                if 'posicion' in validated_data:
                    for pos in instance.posiciones.all():
                        pos.dispositivos.remove(instance)
                
                # 4. Actualizar campos normales
                for attr, value in validated_data.items():
                    setattr(instance, attr, value)
                
                # 5. Actualizar piso según nueva posición
                if 'posicion' in validated_data:
                    instance.piso = nueva_posicion.piso if nueva_posicion else None
                
                instance.save()
                
                # 6. Agregar a nueva posición si existe
                if nueva_posicion:
                    nueva_posicion.dispositivos.add(instance)
                
                # 7. Registrar movimiento con observación detallada
                if posicion_anterior != nueva_posicion:
                    observacion = (
                        f"Reasignación completa de posición | "
                        f"Anterior: {posicion_anterior.nombre if posicion_anterior else 'Ninguna'} ({posicion_anterior.sede.nombre if posicion_anterior else 'N/A'}) | "
                        f"Nueva: {nueva_posicion.nombre if nueva_posicion else 'Ninguna'} ({nueva_posicion.sede.nombre if nueva_posicion else 'N/A'}) | "
                        f"Realizado por: {user.username if user else 'Sistema'}"
                    )
                    
                    Movimiento.objects.create(
                        dispositivo=instance,
                        posicion_origen=posicion_anterior,
                        posicion_destino=nueva_posicion,
                        encargado=user,
                        sede=instance.sede,
                        observacion=observacion
                    )
                
                return instance
                
        except Exception as e:
            raise serializers.ValidationError({
                'non_field_errors': f'Error crítico al actualizar: {str(e)}'
            })

class SedeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Sede
        fields = ['id', 'nombre', 'ciudad', 'direccion']

class ServiciosSerializer(serializers.ModelSerializer):
    sedes = SedeSerializer(many=True, read_only=True)

    class Meta:
        model = Servicios
        fields = ['id', 'nombre', 'codigo_analitico', 'sedes', 'color']

from rest_framework import serializers # type: ignore # type: ignore
from django.db import transaction # type: ignore
from .models import Posicion, Dispositivo, Movimiento
from django.contrib.auth import get_user_model # type: ignore

User = get_user_model()

class PosicionSerializer(serializers.ModelSerializer):
    dispositivos = serializers.PrimaryKeyRelatedField(
        many=True, 
        queryset=Dispositivo.objects.all(),
        required=False
    )
    sede_nombre = serializers.CharField(source='sede.nombre', read_only=True)
    cantidad_dispositivos = serializers.SerializerMethodField()
    
    class Meta:
        model = Posicion
        fields = '__all__'
        extra_kwargs = {
            'sede': {'required': True}
        }

    def get_authenticated_user(self):
        """Obtiene el usuario autenticado del contexto de la solicitud"""
        request = self.context.get('request')
        if not request or not hasattr(request, 'user'):
            return None
        
        user = request.user
        if user.is_anonymous:
            return None
        
        return user

    def get_cantidad_dispositivos(self, obj):
        """Obtiene la cantidad de dispositivos asociados a la posición"""
        return obj.dispositivos.count()

    def validate(self, data):
        """Validación personalizada para los datos de la posición"""
        instance = self.instance
        
        # Validación de celdas combinadas
        merged_cells = data.get('mergedCells', [])
        for cell in merged_cells:
            row = cell.get('row')
            col = cell.get('col')
            
            # Obtener los valores de sede y piso
            piso = data.get('piso', instance.piso if instance else None)
            sede = data.get('sede', instance.sede if instance else None)
            
            # Filtrar por piso, sede y celda combinada
            query = Posicion.objects.filter(
                piso=piso,
                sede=sede,
                mergedCells__contains=[{'row': row, 'col': col}]
            )
            
            if instance:
                query = query.exclude(id=instance.id)
            
            if query.exists():
                raise serializers.ValidationError(f"La celda {row}-{col} ya está ocupada en el piso {piso} de la sede seleccionada.")
        
        # Validación de fila y columna
        if data.get("fila") is not None and data.get("fila") < 1:
            raise serializers.ValidationError("La fila debe ser un número positivo.")
        
        if data.get("columna") is not None and not data.get("columna").isalpha():
            raise serializers.ValidationError("La columna debe contener solo letras.")

        # Validación de dispositivos
        dispositivos_data = data.get('dispositivos')
        sede = data.get('sede', getattr(instance, 'sede', None))
        
        if dispositivos_data and sede:
            dispositivos = Dispositivo.objects.filter(id__in=[d.id for d in dispositivos_data]).select_related('sede')
            
            for dispositivo in dispositivos:
                if dispositivo.sede_id != sede.id:
                    raise serializers.ValidationError({
                        'dispositivos': f'El dispositivo {dispositivo.serial} pertenece a la sede {dispositivo.sede.nombre}, no coincide con {sede.nombre}'
                    })
        
        return data

    def create(self, validated_data):
        """Crea una nueva posición con sus dispositivos asociados"""
        user = self.get_authenticated_user()
        dispositivos_data = validated_data.pop('dispositivos', [])

        try:
            with transaction.atomic():
                # Crear la posición
                instance = super().create(validated_data)
                
                # Registrar movimiento de creación
                if user:
                    Movimiento.objects.create(
                        dispositivo=None,
                        posicion_origen=None,
                        posicion_destino=instance,
                        encargado=user,
                        sede=instance.sede,
                        observacion=f"Creación de posición {instance.nombre}"
                    )
                
                # Validar límite de dispositivos
                if len(dispositivos_data) > Posicion.MAX_DISPOSITIVOS:
                    raise serializers.ValidationError({
                        'dispositivos': f'Máximo {Posicion.MAX_DISPOSITIVOS} dispositivos permitidos'
                    })
                
                # Asignar dispositivos si se proporcionaron
                if dispositivos_data:
                    dispositivos_ids = [d.id if isinstance(d, Dispositivo) else d for d in dispositivos_data]
                    dispositivos = Dispositivo.objects.filter(id__in=dispositivos_ids).select_related('sede')
                    
                    for dispositivo in dispositivos:
                        # Validar sede
                        if dispositivo.sede_id != instance.sede_id:
                            raise serializers.ValidationError({
                                'dispositivos': f'El dispositivo {dispositivo.serial} pertenece a la sede {dispositivo.sede.nombre}, no coincide con {instance.sede.nombre}'
                            })
                        
                        # Remover de posiciones anteriores
                        posiciones_anteriores = list(dispositivo.posiciones.all())
                        for pos in posiciones_anteriores:
                            pos.dispositivos.remove(dispositivo)
                            
                            # Registrar movimiento de salida
                            if user:
                                Movimiento.objects.create(
                                    dispositivo=dispositivo,
                                    posicion_origen=pos,
                                    posicion_destino=None,
                                    encargado=user,
                                    sede=pos.sede,
                                    observacion=(
                                        f"Removido para reasignación | "
                                        f"Destino: {instance.nombre} | "
                                        f"Por: {user.username if user else 'Sistema'}"
                                    )
                                )
                        
                        # Agregar a nueva posición
                        instance.dispositivos.add(dispositivo)
                        
                        # Registrar movimiento de entrada
                        if user:
                            Movimiento.objects.create(
                                dispositivo=dispositivo,
                                posicion_origen=None,
                                posicion_destino=instance,
                                encargado=user,
                                sede=instance.sede,
                                observacion=(
                                    f"Asignado a nueva posición {instance.nombre} | "
                                    f"Sede: {instance.sede.nombre} | "
                                    f"Por: {user.username if user else 'Sistema'}"
                                )
                            )
                        
                        # Actualizar dispositivo
                        dispositivo.posicion = instance
                        dispositivo.piso = instance.piso
                        dispositivo.sede = instance.sede
                        dispositivo.save()
                
                return instance
                
        except Exception as e:
            raise serializers.ValidationError({
                'non_field_errors': f'Error al crear posición: {str(e)}'
            })

    def update(self, instance, validated_data):
        """Actualiza una posición existente y gestiona cambios en dispositivos"""
        user = self.get_authenticated_user()
        dispositivos_data = validated_data.pop('dispositivos', None)

        try:
            with transaction.atomic():
                # 1. Actualizar campos básicos
                for attr, value in validated_data.items():
                    setattr(instance, attr, value)
                instance.save()
                
                # Registrar movimiento de actualización
                if user:
                    Movimiento.objects.create(
                        dispositivo=None,
                        posicion_origen=None,
                        posicion_destino=instance,
                        encargado=user,
                        sede=instance.sede,
                        observacion=f"Actualización de posición {instance.nombre}"
                    )
                
                # 2. Procesar cambios en dispositivos si se enviaron
                if dispositivos_data is not None:
                    dispositivos_ids = [d.id if isinstance(d, Dispositivo) else d for d in dispositivos_data]
                    
                    # Validar límite
                    if len(dispositivos_ids) > Posicion.MAX_DISPOSITIVOS:
                        raise serializers.ValidationError({
                            'dispositivos': f'Máximo {Posicion.MAX_DISPOSITIVOS} dispositivos permitidos'
                        })
                    
                    # Obtener dispositivos actuales y nuevos
                    dispositivos_actuales = set(instance.dispositivos.values_list('id', flat=True))
                    nuevos_dispositivos = set(dispositivos_ids)
                    
                    # Dispositivos a remover
                    dispositivos_a_remover = dispositivos_actuales - nuevos_dispositivos
                    if dispositivos_a_remover:
                        dispositivos_remover = Dispositivo.objects.filter(id__in=dispositivos_a_remover)
                        
                        for dispositivo in dispositivos_remover:
                            instance.dispositivos.remove(dispositivo)
                            
                            # Registrar movimiento
                            if user:
                                Movimiento.objects.create(
                                    dispositivo=dispositivo,
                                    posicion_origen=instance,
                                    posicion_destino=None,
                                    encargado=user,
                                    sede=instance.sede,
                                    observacion=(
                                        f"Removido de posición {instance.nombre} | "
                                        f"Sede: {instance.sede.nombre} | "
                                        f"Por: {user.username if user else 'Sistema'}"
                                    )
                                )
                            
                            # Actualizar dispositivo
                            dispositivo.posicion = None
                            dispositivo.piso = None
                            dispositivo.save()
                    
                    # Dispositivos a agregar
                    dispositivos_a_agregar = nuevos_dispositivos - dispositivos_actuales
                    if dispositivos_a_agregar:
                        dispositivos_agregar = Dispositivo.objects.filter(id__in=dispositivos_a_agregar).select_related('sede')
                        
                        for dispositivo in dispositivos_agregar:
                            # Validar que la sede del dispositivo coincida
                            if dispositivo.sede_id != instance.sede_id:
                                raise serializers.ValidationError({
                                    'dispositivos': f'El dispositivo {dispositivo.serial} pertenece a la sede {dispositivo.sede.nombre}, no coincide con {instance.sede.nombre}'
                                })
                            
                            # Remover de cualquier posición anterior
                            posiciones_anteriores = list(dispositivo.posiciones.all())
                            for pos in posiciones_anteriores:
                                pos.dispositivos.remove(dispositivo)
                                
                                # Registrar movimiento de salida
                                if user:
                                    Movimiento.objects.create(
                                        dispositivo=dispositivo,
                                        posicion_origen=pos,
                                        posicion_destino=None,
                                        encargado=user,
                                        sede=pos.sede,
                                        observacion=(
                                            f"Removido para reasignación | "
                                            f"Destino: {instance.nombre} | "
                                            f"Por: {user.username if user else 'Sistema'}"
                                        )
                                    )
                            
                            # Agregar a nueva posición
                            instance.dispositivos.add(dispositivo)
                            
                            # Registrar movimiento de entrada
                            if user:
                                Movimiento.objects.create(
                                    dispositivo=dispositivo,
                                    posicion_origen=None,
                                    posicion_destino=instance,
                                    encargado=user,
                                    sede=instance.sede,
                                    observacion=(
                                        f"Asignado a posición {instance.nombre} | "
                                        f"Sede: {instance.sede.nombre} | "
                                        f"Por: {user.username if user else 'Sistema'}"
                                    )
                                )
                            
                            # Actualizar dispositivo
                            dispositivo.posicion = instance
                            dispositivo.piso = instance.piso
                            dispositivo.sede = instance.sede
                            dispositivo.save()
                
                return instance
                
        except Exception as e:
            raise serializers.ValidationError({
                'non_field_errors': f'Error al actualizar posición: {str(e)}'
            })


class HistorialSerializer(serializers.ModelSerializer):
    dispositivo = DispositivoSerializer(read_only=True)
    usuario = RolUserSerializer(read_only=True)
    tipo_cambio_display = serializers.CharField(source='get_tipo_cambio_display', read_only=True)
    fecha_formateada = serializers.SerializerMethodField()
    
    class Meta:
        model = Historial
        fields = [
            'id', 'dispositivo', 'usuario', 'fecha_modificacion', 
            'fecha_formateada', 'tipo_cambio', 'tipo_cambio_display', 'cambios'
        ]
    
    def get_fecha_formateada(self, obj):
        return obj.fecha_modificacion.strftime("%d/%m/%Y %H:%M")

from rest_framework import serializers # type: ignore
from .models import Movimiento, Dispositivo, Posicion, RolUser

class MovimientoSerializer(serializers.ModelSerializer):
    dispositivo_info = serializers.SerializerMethodField()
    posicion_origen_info = serializers.SerializerMethodField()
    posicion_destino_info = serializers.SerializerMethodField()
    encargado_info = serializers.SerializerMethodField()
    sede_info = serializers.SerializerMethodField()
    confirmado = serializers.BooleanField(read_only=True)
    fecha_confirmacion = serializers.DateTimeField(read_only=True)

    class Meta:
        model = Movimiento
        fields = [
            'id', 'fecha_movimiento', 'dispositivo', 'dispositivo_info',
            'posicion_origen', 'posicion_origen_info', 'posicion_destino', 
            'posicion_destino_info', 'encargado', 'encargado_info',
            'observacion', 'sede', 'sede_info'
            'confirmado', 'fecha_confirmacion'
        ]
        extra_kwargs = {
            'fecha_movimiento': {'read_only': True},
            'encargado': {'required': False}
        }

    def get_dispositivo_info(self, obj):
        if obj.dispositivo:
            return {
                'id': obj.dispositivo.id,
                'serial': obj.dispositivo.serial,
                'modelo': obj.dispositivo.modelo,
                'tipo': obj.dispositivo.get_tipo_display()
            }
        return None

    def get_posicion_origen_info(self, obj):
        if obj.posicion_origen:
            return {
                'id': obj.posicion_origen.id,
                'nombre': obj.posicion_origen.nombre,
                'piso': obj.posicion_origen.piso,
                'sede': obj.posicion_origen.sede.nombre if obj.posicion_origen.sede else None
            }
        return None

    def get_posicion_destino_info(self, obj):
        if obj.posicion_destino:
            return {
                'id': obj.posicion_destino.id,
                'nombre': obj.posicion_destino.nombre,
                'piso': obj.posicion_destino.piso,
                'sede': obj.posicion_destino.sede.nombre if obj.posicion_destino.sede else None
            }
        return None

    def get_encargado_info(self, obj):
        if obj.encargado:
            return {
                'id': obj.encargado.id,
                'nombre': obj.encargado.nombre,
                'email': obj.encargado.email
            }
        return None

    def get_sede_info(self, obj):
        if obj.sede:
            return {
                'id': obj.sede.id,
                'nombre': obj.sede.nombre
            }
        return None

    def validate(self, data):
        """
        Validaciones personalizadas para los movimientos al actualizar
        """
        instance = getattr(self, 'instance', None)
        data = super().validate(data)
        
        # Validaciones específicas para actualización
        if instance and self.context.get('request').method in ['PUT', 'PATCH']:
            pos_destino = data.get('posicion_destino', instance.posicion_destino)
            dispositivo = data.get('dispositivo', instance.dispositivo)
            
            # Verificar que no se mueva el dispositivo a la misma posición
            if pos_destino and dispositivo.posicion == pos_destino:
                raise serializers.ValidationError(
                    {'posicion_destino': 'El dispositivo ya está en esta posición'}
                )
        
        return data

    def create(self, validated_data):
        """
        Sobreescribe el método create para asignar automáticamente el usuario logueado
        """
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            user = request.user
            if hasattr(user, 'roluser'):
                validated_data['encargado'] = user.roluser
        
        return super().create(validated_data)