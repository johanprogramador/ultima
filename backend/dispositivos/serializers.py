from rest_framework import serializers # type: ignore
from django.contrib.auth import authenticate # type: ignore
from django.contrib.auth.hashers import make_password # type: ignore
from django.utils.translation import gettext_lazy as _
from .models import RolUser, Sede, Dispositivo, Servicios, Posicion, Historial



class RolUserSerializer(serializers.ModelSerializer):
    sedes = serializers.PrimaryKeyRelatedField(queryset=Sede.objects.all(), many=True, required=False)
    password = serializers.CharField(write_only=True, required=False, min_length=8)

    class Meta:
        model = RolUser
        fields = ['id', 'username', 'nombre', 'email', 'rol', 'celular', 'documento', 'sedes', 'password', 'is_active']

    def validate_email(self, value):
        """
        Se normaliza el email antes de guardarlo.
        """
        return value.lower().strip()

    def validate_celular(self, value):
        """
        Se asegura que el celular cumpla con el formato requerido.
        """
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
    

class PosicionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Posicion
        fields = '__all__'



from rest_framework import serializers
from .models import Dispositivo, Sede, Posicion

class DispositivoSerializer(serializers.ModelSerializer):
    sede = serializers.PrimaryKeyRelatedField(
        queryset=Sede.objects.all(), 
        required=False,
        allow_null=True,
        error_messages={
            'does_not_exist': 'La sede seleccionada no existe'
        }
    )
    nombre_sede = serializers.SerializerMethodField()
    posicion = serializers.PrimaryKeyRelatedField(
        queryset=Posicion.objects.all(), 
        required=False,
        allow_null=True,
        error_messages={
            'does_not_exist': 'La posición seleccionada no existe'
        }
    )

    # Campos display para choices
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
            'proveedor', 'estado_propiedad', 'estado_uso', 'observaciones',
            'is_operativo'
        ]
        extra_kwargs = {
            'serial': {
                'required': True,
                'allow_blank': False,
                'error_messages': {
                    'required': 'El serial es obligatorio',
                    'blank': 'El serial no puede estar vacío'
                }
            },
            'modelo': {
                'required': True, 
                'allow_blank': False,
                'error_messages': {
                    'required': 'El modelo es obligatorio',
                    'blank': 'El modelo no puede estar vacío'
                }
            },
            'tipo': {
                'required': True,
                'error_messages': {
                    'required': 'El tipo de dispositivo es obligatorio',
                    'invalid_choice': 'Tipo de dispositivo no válido'
                }
            },
            'marca': {
                'required': True,
                'error_messages': {
                    'required': 'La marca es obligatoria',
                    'invalid_choice': 'Marca no válida'
                }
            },
            'estado': {
                'required': True,
                'error_messages': {
                    'required': 'El estado es obligatorio',
                    'invalid_choice': 'Estado no válido'
                }
            },
            'placa_cu': {
                'allow_blank': True,
                'error_messages': {
                    'unique': 'Esta placa CU ya está registrada'
                }
            },
            'observaciones': {
                'allow_blank': True,
                'required': False
            }
        }

    def get_nombre_sede(self, obj):
        return obj.sede.nombre if obj.sede else None

    def get_is_operativo(self, obj):
        return obj.is_operativo()

    def validate(self, data):
        request = self.context.get('request')

        # Validación de serial único (solo en creación)
        if request and request.method == 'POST' and 'serial' in data:
            if Dispositivo.objects.filter(serial=data['serial']).exists():
                raise serializers.ValidationError({
                    'serial': 'Ya existe un dispositivo con este serial'
                })

        # Validación de placa_cu único (si se proporciona)
        if 'placa_cu' in data and data['placa_cu']:
            queryset = Dispositivo.objects.filter(placa_cu=data['placa_cu'])
            if self.instance:
                queryset = queryset.exclude(pk=self.instance.pk)
            if queryset.exists():
                raise serializers.ValidationError({
                    'placa_cu': 'Ya existe un dispositivo con esta placa CU'
                })

        # Validar coherencia entre sede y posición
        if data.get('posicion') and not data.get('sede'):
            raise serializers.ValidationError({
                'sede': 'Debe especificar una sede si asigna una posición'
            })
        if data.get('posicion') and data.get('sede'):
            if data['posicion'].sede != data['sede']:
                raise serializers.ValidationError({
                    'posicion': 'La posición no pertenece a la sede seleccionada'
                })

        # Validar campos requeridos según tipo de dispositivo
        dispositivo_tipo = data.get('tipo', getattr(self.instance, 'tipo', None))

        if dispositivo_tipo in self.TIPOS_CON_REQUISITOS:
            required_fields = {
                'capacidad_memoria_ram': 'Capacidad de RAM requerida para este dispositivo',
                'sistema_operativo': 'Sistema operativo requerido para este dispositivo',
                'procesador': 'Procesador requerido para este dispositivo'
            }
            for field, error_msg in required_fields.items():
                if not data.get(field) and not getattr(self.instance, field, None):
                    raise serializers.ValidationError({field: error_msg})

        # Validar estado de uso coherente con estado del dispositivo
        if data.get('estado') in self.ESTADOS_INVALIDOS:
            if data.get('estado_uso') and data.get('estado_uso') != 'INHABILITADO':
                raise serializers.ValidationError({
                    'estado_uso': 'El estado de uso debe ser INHABILITADO cuando el estado del dispositivo es inválido.'
                })
            data['estado_uso'] = 'INHABILITADO'

        return data

    def create(self, validated_data):
        try:
            if validated_data.get('posicion'):
                validated_data['piso'] = validated_data['posicion'].piso
            return super().create(validated_data)
        except Exception as e:
            raise serializers.ValidationError({
                'non_field_errors': f'Error al crear el dispositivo: {str(e)}'
            })

    def update(self, instance, validated_data):
        try:
            for attr, value in validated_data.items():
                setattr(instance, attr, value)

            if 'posicion' in validated_data:
                instance.piso = validated_data['posicion'].piso if validated_data['posicion'] else None

            instance.save()
            return instance
        except Exception as e:
            raise serializers.ValidationError({
                'non_field_errors': f'Error al actualizar el dispositivo: {str(e)}'
            })

class SedeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Sede
        fields = ['id', 'nombre', 'ciudad', 'direccion']

class ServiciosSerializer(serializers.ModelSerializer):
    sedes = SedeSerializer(many=True)  # 👈 Aquí usamos el serializador de sede

    class Meta:
        model = Servicios  # Asegúrate de que este es el modelo correcto
        fields = ['id', 'nombre', 'codigo_analitico', 'sedes', 'color']


#serializer.py 
class PosicionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Posicion
        fields = '__all__'

    def validate(self, data):
        # Verificar que las celdas combinadas no se superpongan
        merged_cells = data.get('mergedCells', [])
        instance = self.instance  # Obtener la instancia actual si estamos actualizando
        
        for cell in merged_cells:
            row = cell.get('row')
            col = cell.get('col')
            
            # Consulta para encontrar posiciones que ocupan esta celda
            query = Posicion.objects.filter(
                piso=data.get('piso', instance.piso if instance else None),
                mergedCells__contains=[{'row': row, 'col': col}]
            )
            
            # Si estamos actualizando, excluir la posición actual de la verificación
            if instance:
                query = query.exclude(id=instance.id)
            
            if query.exists():
                raise serializers.ValidationError(f"La celda {row}-{col} ya está ocupada.")
        
        # Validación de fila y columna
        if data.get("fila") is not None and data.get("fila") < 1:
            raise serializers.ValidationError("La fila debe ser un número positivo.")
        
        if data.get("columna") is not None and not data.get("columna").isalpha():
            raise serializers.ValidationError("La columna debe contener solo letras.")

        return data

class HistorialSerializer(serializers.ModelSerializer):
    dispositivo = DispositivoSerializer(read_only=True)
    usuario = RolUserSerializer(read_only=True)
    
    tipo_cambio_display = serializers.CharField(source='get_tipo_cambio_display', read_only=True)
    fecha_formateada = serializers.SerializerMethodField()
    
    class Meta:
        model = Historial
        fields = [
            'id', 
            'dispositivo', 
            'usuario', 
            'fecha_modificacion', 
            'fecha_formateada',
            'tipo_cambio', 
            'tipo_cambio_display', 
            'cambios'
        ]
    
    def get_fecha_formateada(self, obj):
        return obj.fecha_modificacion.strftime("%d/%m/%Y %H:%M")
        