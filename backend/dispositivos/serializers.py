from rest_framework import serializers # type: ignore
from django.contrib.auth import authenticate # type: ignore
from django.contrib.auth.hashers import make_password # type: ignore
from django.utils.translation import gettext_lazy as _
from .models import RolUser, Sede, Dispositivo, Servicios, Posicion



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



class DispositivoSerializer(serializers.ModelSerializer):
    sede = serializers.PrimaryKeyRelatedField(queryset=Sede.objects.all(), required=False)
    nombre_sede = serializers.CharField(source='sede.nombre', read_only=True)
    posicion = serializers.PrimaryKeyRelatedField(queryset=Posicion.objects.all(), required=False)
    estado_propiedad = serializers.CharField(required=False, allow_blank=True)

    class Meta:
        model = Dispositivo
        fields = [
            'id', 'tipo', 'estado', 'marca', 'razon_social', 'regimen', 'modelo', 'serial',
            'placa_cu', 'posicion', 'sede','nombre_sede',
            'tipo_disco_duro', 'capacidad_disco_duro', 'tipo_memoria_ram', 'capacidad_memoria_ram',
            'ubicacion', 'sistema_operativo', 'procesador', 'proveedor', 'estado_propiedad'
        ]

    def create(self, validated_data):
        # Validamos si `sede`, `posicion` o `servicio` existen en la base de datos
        sede = validated_data.pop('sede', None)
        posicion = validated_data.pop('posicion', None)
        

        dispositivo = Dispositivo.objects.create(
            **validated_data,
            sede=Sede.objects.filter(id=sede.id).first() if sede else None,
            posicion=Posicion.objects.filter(id=posicion.id).first() if posicion else None
          
        )
        return dispositivo

    def update(self, instance, validated_data):
        # Actualizamos solo si se proporciona un nuevo valor válido
        sede = validated_data.pop('sede', None)
        posicion = validated_data.pop('posicion', None)
    

        instance.sede = Sede.objects.filter(id=sede.id).first() if sede else instance.sede
        instance.posicion = Posicion.objects.filter(id=posicion.id).first() if posicion else instance.posicion
    

        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        instance.save()
        return instance
        
        
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