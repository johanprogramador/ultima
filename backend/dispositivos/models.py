from django.db import models # type: ignore
from django.contrib.auth.models import AbstractUser # type: ignore
from django.db.models.signals import post_save # type: ignore
from django.dispatch import receiver # type: ignore
from django.conf import settings # type: ignore
from django.core.exceptions import ValidationError # type: ignore
from django.core.validators import RegexValidator # type: ignore
import re
from colorfield.fields import ColorField  # type: ignore
from django.utils.translation import gettext_lazy as _ # type: ignore
from django.contrib.postgres.fields import JSONField # type: ignore
from django.db.models.signals import post_save, pre_save, post_delete # type: ignore
from django.db import transaction # type: ignore
from django.contrib.auth.signals import user_logged_in # type: ignore
from django.utils.timezone import now, timedelta # type: ignore
from django.utils import timezone # type: ignore
import logging
from django.contrib.auth import get_user # type: ignore
from django.db.models.signals import pre_delete # type: ignore


class Sede(models.Model):
    nombre = models.CharField(max_length=100, unique=True)
    ciudad = models.CharField(max_length=100)
    direccion = models.TextField()

    def __str__(self):
        return f"{self.nombre} - {self.ciudad}"

    class Meta:
        verbose_name = "Sede"
        verbose_name_plural = "Sedes"

class RolUser(AbstractUser):
    ROLES_CHOICES = [
        ('admin', 'Administrador'),
        ('coordinador', 'Coordinador'),
        ('celador', 'Celador'),
    ]
    
    rol = models.CharField(max_length=15, choices=ROLES_CHOICES, default='admin')
    nombre = models.CharField("Nombre completo", max_length=150, blank=True, null=True)
    
    celular = models.CharField(
        "Celular",
        max_length=15,
        blank=True,
        null=True,
        validators=[RegexValidator(regex=r'^\+?\d{7,15}$', message="Número de celular inválido")]
    )

    documento = models.CharField(
        "Documento de identificación",
        max_length=50,
        blank=True,
        null=True,
        unique=True
    )

    email = models.EmailField("Correo electrónico", unique=True)

    # Relación con sedes
    sedes = models.ManyToManyField('Sede', blank=True, related_name='usuarios_asignados')

    # Relación con grupos y permisos
    groups = models.ManyToManyField(
        'auth.Group',
        related_name='custom_user_set',
        blank=True,
        help_text='Los grupos a los que pertenece este usuario.',
        related_query_name='custom_user',
    )
    
    user_permissions = models.ManyToManyField(
        'auth.Permission',
        related_name='custom_user_set',
        blank=True,
        help_text='Permisos específicos para este usuario.',
        related_query_name='custom_user',
    )

    def clean(self):
        """
        Método para centralizar las validaciones del modelo.
        """
        # Normalizar email
        if self.email:
            self.email = self.email.lower().strip()
        
        # Validación del número de celular (opcional, ya está validado en el campo)
        if self.celular and not re.match(r'^\+?\d{7,15}$', self.celular):
            raise ValidationError({
                'celular': "El número de celular debe ser un número válido con 7 a 15 dígitos, y puede incluir un signo '+' al principio."
            })

    def save(self, *args, **kwargs):
        # Ejecuta las validaciones antes de guardar
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.nombre} ({self.username})" if self.nombre else self.username

    class Meta:
        verbose_name = "Usuario"
        verbose_name_plural = "Usuarios"
        ordering = ['id']

class Servicios(models.Model):
    nombre = models.CharField(max_length=100)
    codigo_analitico = models.CharField(max_length=255, null=True, blank=True, unique=True)  # Agregado unique=True
    sedes = models.ManyToManyField('Sede', related_name="servicios")
    color = ColorField(default="#FFFFFF")

    def __str__(self):
        return f"{self.nombre} ({self.codigo_analitico})"

    class Meta:
        verbose_name = "Servicios"
        verbose_name_plural = "Servicios"
        
class Posicion(models.Model):
    ESTADOS = [
        ('disponible', 'Disponible'),
        ('ocupado', 'Ocupado'),
        ('reservado', 'Reservado'),
        ('inactivo', 'Inactivo'),
    ]

    MAX_DISPOSITIVOS = 5  # Límite máximo de dispositivos por posición

    nombre = models.CharField(max_length=100, blank=True, null=True)
    tipo = models.CharField(max_length=50, blank=True, null=True)
    estado = models.CharField(max_length=50, choices=ESTADOS, default='disponible')
    detalles = models.TextField(blank=True, null=True)
    fila = models.IntegerField()
    columna = models.CharField(max_length=5)
    color = models.CharField(max_length=20, default='#FFFFFF')
    colorFuente = models.CharField(max_length=20, default='#000000')
    colorOriginal = models.CharField(max_length=50, blank=True, null=True)
    borde = models.BooleanField(default=True)
    bordeDoble = models.BooleanField(default=False)
    bordeDetalle = models.JSONField(default=dict)
    piso = models.CharField(max_length=50)
    sede = models.ForeignKey('Sede', on_delete=models.CASCADE, related_name="posiciones", null=True, blank=True)
    servicio = models.ForeignKey('Servicios', on_delete=models.SET_NULL, related_name="posiciones", null=True, blank=True)
    dispositivos = models.ManyToManyField('Dispositivo', related_name='posiciones', blank=True)
    mergedCells = models.JSONField(default=list)

    def __str__(self):
        return f"{self.nombre} - Piso {self.piso}"

    def clean(self):
        if self.fila < 1:
            raise ValidationError("La fila debe ser un número positivo.")
        if not self.columna.isalpha():
            raise ValidationError("La columna debe contener solo letras.")
        
        # Validar que no se exceda el límite de dispositivos
        if self.pk and self.dispositivos.count() > self.MAX_DISPOSITIVOS:
            raise ValidationError(f"Una posición no puede tener más de {self.MAX_DISPOSITIVOS} dispositivos.")

    def save(self, *args, **kwargs):
        # Variable para controlar si debemos guardar los dispositivos después
        save_dispositivos = False
        dispositivos_temp = None
        
        # Si es un nuevo objeto y tiene dispositivos asignados
        if not self.pk and hasattr(self, '_dispositivos_temp'):
            dispositivos_temp = self._dispositivos_temp
            save_dispositivos = True
            delattr(self, '_dispositivos_temp')
        
        # Si se está eliminando el servicio, restablecer el color al valor por defecto
        if self.servicio_id is None and 'servicio' in kwargs.get('update_fields', []):
            self.color = "#FFFFFF"  # Color por defecto
            self.colorFuente = "#000000"
            if 'update_fields' in kwargs:
                kwargs['update_fields'].extend(['color', 'colorFuente'])
        
        # Si se asigna un servicio, actualizar el color según el servicio
        if self.servicio_id and (not self.pk or 'servicio' in kwargs.get('update_fields', [])):
            self.color = self.servicio.color
            if 'update_fields' in kwargs:
                kwargs['update_fields'].append('color')
        
        # Primero guardamos el objeto para obtener un ID
        super().save(*args, **kwargs)
        
        # Si hay dispositivos temporales, los asignamos después de guardar
        if save_dispositivos and dispositivos_temp:
            self.dispositivos.set(dispositivos_temp)
            
        # Validar el límite de dispositivos después de guardar
        if self.dispositivos.count() > self.MAX_DISPOSITIVOS:
            raise ValidationError(f"Una posición no puede tener más de {self.MAX_DISPOSITIVOS} dispositivos.")

    def cantidad_dispositivos(self):
        return self.dispositivos.count()

    class Meta:
        verbose_name = "Posición"
        verbose_name_plural = "Posiciones"

@receiver(pre_delete, sender='dispositivos.Servicios')
def handle_servicio_delete(sender, instance, **kwargs):
    """
    Cuando se elimina un servicio, actualiza todas las posiciones relacionadas:
    - Elimina la referencia al servicio
    - Restablece el color al valor por defecto
    """
    # Importar aquí para evitar dependencias circulares
    from .models import Posicion
    
    # Actualizar todas las posiciones que tenían este servicio
    Posicion.objects.filter(servicio=instance).update(
        servicio=None,
        color="#FFFFFF",  # Color por defecto
        colorFuente="#000000"
    )

class Dispositivo(models.Model):
    TIPOS_DISPOSITIVOS = [
        ('COMPUTADOR', 'Computador'),
        ('DESKTOP', 'Desktop'),
        ('MONITOR', 'Monitor'),
        ('TABLET', 'Tablet'),
        ('MOVIL', 'Celular'),
        ('HP_PRODISPLAY_P201', 'HP ProDisplay P201'),
        ('PORTATIL', 'Portátil'),
        ('TODO_EN_UNO', 'Todo en uno'),
    ]

    FABRICANTES = [
        ('DELL', 'Dell'),
        ('HP', 'HP'),
        ('LENOVO', 'Lenovo'),
        ('APPLE', 'Apple'),
        ('SAMSUNG', 'Samsung'),
    ]

    ESTADO_DISPOSITIVO = [
        ('BUENO', 'Bueno'),
        ('BODEGA_CN', 'Bodega CN'),
        ('BODEGA', 'Bodega'),
        ('MALA', 'Mala'),
        ('MALO', 'Malo'),
        ('PENDIENTE_BAJA', 'Pendiente/Baja'),
        ('PERDIDO_ROBADO', 'Perdido/Robado'),
        ('REPARAR', 'Reparar'),
        ('REPARAR_BAJA', 'Reparar/Baja'),
        ('SEDE', 'Sede'),
        ('STOCK', 'Stock'),
    ]

    RAZONES_SOCIALES = [
        ('ECCC', 'ECCC'),
        ('ECOL', 'ECOL'),
        ('CNC', 'CNC'),
        ('BODEGA_CN', 'Bodega CN'),
        ('COMPRADO', 'Comprado'),
        ('PROPIO', 'Propio'),
    ]

    CAPACIDADES_DISCO_DURO = [
        ('120GB', '120 GB'),
        ('250GB', '250 GB'),
        ('500GB', '500 GB'),
        ('1TB', '1 TB'),
        ('2TB', '2 TB'),
        ('4TB', '4 TB'),
        ('8TB', '8 TB'),
    ]

    CAPACIDADES_MEMORIA_RAM = [
        ('2GB', '2 GB'),
        ('4GB', '4 GB'),
        ('8GB', '8 GB'),
        ('16GB', '16 GB'),
        ('32GB', '32 GB'),
        ('64GB', '64 GB'),
    ]
    
    SISTEMAS_OPERATIVOS = [
        ('NA', 'No Aplica'),
        ('SERVER', 'Server'),
        ('WIN10', 'Windows 10'),
        ('WIN11', 'Windows 11'),
        ('WIN7', 'Windows 7'),
        ('VACIO', 'Sin Sistema Operativo'),
        ('MACOS', 'MacOS'),
    ]

    PROCESADORES = [
        ('AMD_A12', 'AMD A12'),
        ('AMD_A8_5500B', 'AMD A8-5500B APU'),
        ('AMD_RYZEN', 'AMD RYZEN'),
        ('AMD_RYZEN_3_2200GE', 'AMD Ryzen 3 2200GE'),
        ('I3_6200U', 'Intel Core i3 6200U'),
        ('I5_4430S', 'Intel Core i5 4430s'),
        ('I5_4460', 'Intel Core i5 4460'),
        ('I5_4590', 'Intel Core i5 4590'),
        ('I5_4600', 'Intel Core i5 4600'),
        ('I5_4670', 'Intel Core i5 4670'),
        ('I5_4750', 'Intel Core i5 4750'),
        ('I5_6500', 'Intel Core i5 6500'),
        ('I5_6500T', 'Intel Core i5 6500T'),
        ('I5_7500', 'Intel Core i5 7500'),
        ('I5_8400T', 'Intel Core i5 8400T'),
        ('I5_8500', 'Intel Core i5 8500'),
        ('I5_10TH', 'Intel Core i5 10th Gen'),
        ('I5_11TH', 'Intel Core i5 11th Gen'),
        ('I5_12TH', 'Intel Core i5 12th Gen'),
        ('I7_8TH', 'Intel Core i7 8th Gen'),
        ('I7_12TH', 'Intel Core i7 12th Gen'),
        ('I7_13TH', 'Intel Core i7 13th Gen'),
        ('I7_7TH', 'Intel Core i7 7th Gen'),
        ('I7_8565U', 'Intel Core i7 8565U @ 1.80GHz'),
    ]

    UBICACIONES = [
        ('CASA', 'Casa'),
        ('CLIENTE', 'Cliente'),
        ('SEDE', 'Sede'),
        ('OTRO', 'Otro'),
    ]
    
    ESTADOS_PROPIEDAD = [
        ('PROPIO', 'Propio'),
        ('ARRENDADO', 'Arrendado'),
        ('DONADO', 'Donado'),
        ('OTRO', 'Otro'),
    ]
    
    ESTADO_USO = [
        ('DISPONIBLE', 'Disponible'),
        ('EN_USO', 'En uso'),
        ('INHABILITADO', 'Inhabilitado'),
    ]

    tipo = models.CharField(max_length=20, choices=TIPOS_DISPOSITIVOS)
    estado = models.CharField(max_length=18, choices=ESTADO_DISPOSITIVO, null=True, blank=True)
    marca = models.CharField(max_length=20, choices=FABRICANTES, db_index=True)
    regimen = models.CharField(max_length=100, null=True, blank=True)
    razon_social = models.CharField(max_length=100, choices=RAZONES_SOCIALES, null=True, blank=True)
    modelo = models.CharField(max_length=50, db_index=True)
    serial = models.CharField(max_length=50, unique=True, db_index=True)
    placa_cu = models.CharField(max_length=50, unique=True, null=True, blank=True)
    piso = models.CharField(max_length=10, null=True, blank=True)
    estado_propiedad = models.CharField(max_length=10, choices=ESTADOS_PROPIEDAD, null=True, blank=True)
    posicion = models.ForeignKey(Posicion, on_delete=models.SET_NULL, null=True, blank=True, related_name='dispositivos_relacionados')
    sede = models.ForeignKey('Sede', on_delete=models.SET_NULL, null=True, blank=True, related_name="dispositivos", db_index=True)
    capacidad_disco_duro = models.CharField(max_length=10, choices=CAPACIDADES_DISCO_DURO, null=True, blank=True)
    capacidad_memoria_ram = models.CharField(max_length=10, choices=CAPACIDADES_MEMORIA_RAM, null=True, blank=True)
    ubicacion = models.CharField(max_length=10, choices=UBICACIONES, null=True, blank=True)
    proveedor = models.CharField(max_length=100, null=True, blank=True)
    sistema_operativo = models.CharField(max_length=20, choices=SISTEMAS_OPERATIVOS, null=True, blank=True)
    procesador = models.CharField(max_length=100, choices=PROCESADORES, null=True, blank=True)
    estado_uso = models.CharField(max_length=100, choices=ESTADO_USO, null=True, blank=True)
    observaciones = models.TextField(max_length=500, null=True, blank=True, verbose_name="Observaciones adicionales")
    
    def __str__(self):
        return f"{self.tipo} {self.marca} {self.modelo} - {self.serial}"

    def clean(self):
        # Validación para asegurar que la sede del dispositivo coincida con la sede de la posición
        if self.posicion and self.sede and self.posicion.sede != self.sede:
            raise ValidationError(
                f"La posición seleccionada pertenece a la sede {self.posicion.sede.nombre}, "
                f"pero el dispositivo está asignado a la sede {self.sede.nombre}. "
                "Deben coincidir."
            )
        
        # Validación para asegurar que la posición no tenga demasiados dispositivos
        if self.posicion and self.posicion.dispositivos.count() >= Posicion.MAX_DISPOSITIVOS:
            raise ValidationError(
                f"Esta posición ya tiene el máximo de {Posicion.MAX_DISPOSITIVOS} dispositivos asignados."
            )

    def save(self, *args, **kwargs):
        # Si se asigna una posición, asegurarse de que la sede coincida
        if self.posicion and not self.sede:
            self.sede = self.posicion.sede
        elif self.posicion and self.sede and self.posicion.sede != self.sede:
            # Esto debería ser manejado por clean(), pero por si acaso
            raise ValidationError("La sede del dispositivo no coincide con la sede de la posición")
        
        self.clean()
        super().save(*args, **kwargs)

    def is_operativo(self):
        return self.estado_uso == 'EN_USO' and self.estado == 'BUENO'

    class Meta:
        verbose_name = "Dispositivo"
        verbose_name_plural = "Dispositivos"

class Historial(models.Model):
    class TipoCambio(models.TextChoices):  
        CREACION = 'CREACION', _('Creación de dispositivo')
        MODIFICACION = 'MODIFICACION', _('Modificación de datos')
        MOVIMIENTO = 'MOVIMIENTO', _('Movimiento registrado')
        LOGIN = 'LOGIN', _('Inicio de sesión')
        OTRO = 'OTRO', _('Otro')
        ELIMINACION = 'ELIMINACION', 'Eliminación' 

    dispositivo = models.ForeignKey('Dispositivo', on_delete=models.CASCADE, related_name='historial', null=True, blank=True)
    usuario = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    fecha_modificacion = models.DateTimeField(default=timezone.now)
    cambios = models.JSONField(null=True, blank=True)
    tipo_cambio = models.CharField(max_length=20, choices=TipoCambio.choices, default=TipoCambio.OTRO)
    modelo_afectado = models.CharField(max_length=100, null=True, blank=True)
    instancia_id = models.PositiveIntegerField(null=True, blank=True)
    sede_nombre = models.CharField(max_length=100, null=True, blank=True)

    def __str__(self):
        return f"{self.get_tipo_cambio_display()} - {self.fecha_modificacion}"

    class Meta:
        ordering = ['-fecha_modificacion']
        verbose_name = "Historial"
        verbose_name_plural = "Historiales"


from django.db import models # type: ignore
from django.conf import settings # type: ignore
from django.core.exceptions import ValidationError # type: ignore
from django.db.models.signals import pre_save, post_save # type: ignore
from django.dispatch import receiver # type: ignore
from django.db import transaction # type: ignore
import logging

logger = logging.getLogger(__name__)
class Movimiento(models.Model):
    UBICACIONES = (
        ('BODEGA', 'Bodega'),
        ('SEDE', 'Sede'),
        ('REPARACION', 'Reparación'),
        ('BAJA', 'Baja'),
        ('OTRO', 'Otro'),
    )
    
    dispositivo = models.ForeignKey(
        'Dispositivo',
        on_delete=models.CASCADE,
        related_name='movimientos'
    )
    encargado = models.ForeignKey(
        'RolUser',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='movimientos_realizados'
    )
    fecha_movimiento = models.DateTimeField(auto_now_add=True)
    posicion_origen = models.ForeignKey(
        'Posicion',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='movimientos_salida'
    )
    posicion_destino = models.ForeignKey(
        'Posicion',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='movimientos_entrada'
    )
    ubicacion_origen = models.CharField(
        max_length=20,
        choices=UBICACIONES,
        null=True,
        blank=True
    )
    ubicacion_destino = models.CharField(
        max_length=20,
        choices=UBICACIONES,
        null=True,
        blank=True
    )
    observacion = models.TextField(blank=True)
    sede = models.ForeignKey(
        'Sede',
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )
    
    confirmado = models.BooleanField(default=False)
    fecha_confirmacion = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-fecha_movimiento']
        verbose_name = 'Movimiento'
        verbose_name_plural = 'Movimientos'
        indexes = [
            models.Index(fields=['fecha_movimiento']),
            models.Index(fields=['dispositivo']),
            models.Index(fields=['encargado']),
        ]

    def __str__(self):
        return f"Movimiento #{self.id} - {self.dispositivo.serial}"

    def clean(self):
        # Validación 1: Origen y destino no pueden ser iguales
        if self.posicion_origen and self.posicion_destino and self.posicion_origen == self.posicion_destino:
            raise ValidationError("La posición de origen y destino no pueden ser la misma")
        
        # Validación 2: Requiere al menos un tipo de origen y destino
        if not self.posicion_origen and not self.ubicacion_origen:
            raise ValidationError("Debe especificar una ubicación de origen (posición o tipo)")
            
        if not self.posicion_destino and not self.ubicacion_destino:
            raise ValidationError("Debe especificar una ubicación de destino (posición o tipo)")

    def save(self, *args, **kwargs):
        # Autocompletar sede si no está especificada
        if not self.sede:
            if self.dispositivo and self.dispositivo.sede:
                self.sede = self.dispositivo.sede
            elif self.posicion_destino and self.posicion_destino.sede:
                self.sede = self.posicion_destino.sede
        
        # Autogenerar observación si está vacía
        if not self.observacion:
            self.observacion = self.generar_observacion()
        
        super().save(*args, **kwargs)

    def generar_observacion(self):
        partes = [f"Dispositivo: {self.dispositivo.serial}"]
        
        if self.posicion_origen:
            partes.append(f"Desde posición: {self.posicion_origen.nombre}")
        elif self.ubicacion_origen:
            partes.append(f"Desde: {self.get_ubicacion_origen_display()}")
        
        if self.posicion_destino:
            partes.append(f"Hacia posición: {self.posicion_destino.nombre}")
        elif self.ubicacion_destino:
            partes.append(f"Hacia: {self.get_ubicacion_destino_display()}")
        
        if self.encargado:
            partes.append(f"Realizado por: {self.encargado.nombre_completo}")
        
        return " | ".join(partes)

# Señales
@receiver(pre_save, sender='dispositivos.Dispositivo')
def capturar_posicion_anterior(sender, instance, **kwargs):
    if instance.pk:
        try:
            original = sender.objects.get(pk=instance.pk)
            instance._posicion_anterior = original.posicion
        except sender.DoesNotExist:
            instance._posicion_anterior = None

@receiver(post_save, sender='dispositivos.Dispositivo')
def registrar_movimiento_automatico(sender, instance, created, **kwargs):
    if created or not hasattr(instance, '_posicion_anterior'):
        return
    
    if instance._posicion_anterior != instance.posicion:
        try:
            request = kwargs.get('request')
            user = getattr(request, 'user', None) if request else None
            encargado = user.roluser if (user and hasattr(user, 'roluser')) else None
            
            with transaction.atomic():
                Movimiento.objects.create(
                    dispositivo=instance,
                    posicion_origen=instance._posicion_anterior,
                    posicion_destino=instance.posicion,
                    encargado=encargado,
                    observacion="Movimiento automático por cambio de posición",
                    sede=instance.sede
                )
        except Exception as e:
            logger.error(f"Error al registrar movimiento automático: {str(e)}")

@receiver(pre_save, sender=Dispositivo)
def guardar_estado_anterior(sender, instance, **kwargs):
    if instance.pk:
        try:
            instance._estado_anterior = Dispositivo.objects.get(pk=instance.pk)
        except Dispositivo.DoesNotExist:
            instance._estado_anterior = None

@receiver(post_save, sender=Dispositivo)
def registrar_cambios_historial(sender, instance, created, **kwargs):
    from django.contrib.auth import get_user # type: ignore
    from django.core.exceptions import ObjectDoesNotExist # type: ignore
    
    try:
        request = kwargs.get('request', None)
        if request:
            usuario_actual = request.user
        else:
            usuario_actual = None
    except ObjectDoesNotExist:
        usuario_actual = None

    cambios = {}
    estado_anterior = getattr(instance, '_estado_anterior', None)
    sede = instance.posicion.sede.nombre if instance.posicion and instance.posicion.sede else None

    if created:
        for field in instance._meta.fields:
            nombre = field.name
            valor = getattr(instance, nombre)
            cambios[nombre] = {"antes": None, "despues": str(valor)}

        Historial.objects.create(
            dispositivo=instance,
            usuario=usuario_actual,
            cambios=cambios,
            tipo_cambio=Historial.TipoCambio.CREACION,
            modelo_afectado="Dispositivo",
            instancia_id=instance.id,
            sede_nombre=sede,
            fecha_modificacion=timezone.now()  
        )
        return

    if estado_anterior:
        for field in instance._meta.fields:
            nombre = field.name
            valor_anterior = getattr(estado_anterior, nombre)
            valor_nuevo = getattr(instance, nombre)

            if valor_anterior != valor_nuevo:
                cambios[nombre] = {"antes": str(valor_anterior), "despues": str(valor_nuevo)}

    if cambios:
        Historial.objects.create(
            dispositivo=instance,
            usuario=usuario_actual,
            cambios=cambios,
            tipo_cambio=Historial.TipoCambio.MODIFICACION,
            modelo_afectado="Dispositivo",
            instancia_id=instance.id,
            sede_nombre=sede
        )



@receiver(user_logged_in)
def registrar_login(sender, request, user, **kwargs):
    sede = getattr(user, 'sede', None)
    hace_un_minuto = now() - timedelta(minutes=1)

    if Historial.objects.filter(
        usuario=user,
        tipo_cambio=Historial.TipoCambio.LOGIN,
        fecha_modificacion__gte=hace_un_minuto
    ).exists():
        return

    Historial.objects.create(
        usuario=user,
        cambios={"mensaje": "Inicio de sesión exitoso"},
        tipo_cambio=Historial.TipoCambio.LOGIN,
        modelo_afectado="Usuario",
        instancia_id=user.id,
        sede_nombre=str(sede) if sede else None
    )

@receiver(post_delete)
def registrar_eliminacion(sender, instance, **kwargs):
    if sender.__name__ in ['Dispositivo', 'Movimiento', 'RolUser', 'Usuario']:
        sede = None
        usuario = getattr(instance, 'usuario', None)

        if hasattr(instance, 'posicion') and instance.posicion and instance.posicion.sede:
            sede = instance.posicion.sede.nombre

        Historial.objects.create(
            cambios={"mensaje": f"Instancia de {sender.__name__} eliminada", "valores": str(instance)},
            tipo_cambio=Historial.TipoCambio.ELIMINACION,
            modelo_afectado=sender.__name__,
            instancia_id=instance.id,
            usuario=usuario,
            sede_nombre=sede
        )
        
@receiver(post_save, sender=Movimiento)
def actualizar_posicion_despues_movimiento(sender, instance, created, **kwargs):
    """
    Actualiza automáticamente la posición del dispositivo cuando se confirma un movimiento
    """
    if instance.confirmado and instance.posicion_destino and instance.dispositivo:
        dispositivo = instance.dispositivo
        posicion_anterior = dispositivo.posicion
        
        # Remover de posición anterior si existe
        if posicion_anterior:
            posicion_anterior.dispositivos.remove(dispositivo)
        
        # Agregar a nueva posición
        instance.posicion_destino.dispositivos.add(dispositivo)
        
        # Actualizar dispositivo
        dispositivo.posicion = instance.posicion_destino
        dispositivo.sede = instance.posicion_destino.sede if instance.posicion_destino.sede else instance.sede
        dispositivo.save()
        
        # Registrar en el historial
        Historial.objects.create(
            dispositivo=dispositivo,
            usuario=instance.encargado,
            tipo_cambio=Historial.TipoCambio.MOVIMIENTO,
            cambios={
                "movimiento_id": instance.id,
                "posicion_anterior": posicion_anterior.id if posicion_anterior else None,
                "posicion_nueva": instance.posicion_destino.id
            }
        )
        
        
class Celador(RolUser):
    """Extiende el modelo RolUser para el rol de celador"""
    class Meta:
        proxy = True
        verbose_name = 'Celador'
        verbose_name_plural = 'Celadores'

    def save(self, *args, **kwargs):
        self.rol = 'celador'
        super().save(*args, **kwargs)

from django.db import models
from django.core.validators import MinLengthValidator

class UsuarioExterno(models.Model):
    """Modelo para usuarios externos que no están en el sistema de autenticación"""
    TIPOS_DOCUMENTO = [
        ('CC', 'Cédula de Ciudadanía'),
        ('CE', 'Cédula de Extranjería'),
        ('TI', 'Tarjeta de Identidad'),
        ('PASAPORTE', 'Pasaporte'),
    ]
    
    tipo_documento = models.CharField(max_length=10, choices=TIPOS_DOCUMENTO, default='CC')
    documento = models.CharField(
        max_length=20,
        unique=True,
        validators=[MinLengthValidator(5)],
        help_text="Número de documento de identidad"
    )
    nombre_completo = models.CharField(max_length=150)
    cargo = models.CharField(max_length=100)
    empresa = models.CharField(max_length=100, blank=True, null=True)
    telefono = models.CharField(max_length=15, blank=True, null=True)
    email = models.EmailField(blank=True, null=True)
    fecha_registro = models.DateTimeField(auto_now_add=True)
    activo = models.BooleanField(default=True)
    observaciones = models.TextField(blank=True, null=True)
    
    class Meta:
        verbose_name = 'Usuario Externo'
        verbose_name_plural = 'Usuarios Externos'
        ordering = ['nombre_completo']
    
    def __str__(self):
        return f"{self.nombre_completo} ({self.get_tipo_documento_display()} {self.documento})"

class AsignacionDispositivo(models.Model):
    """Modelo para asignar dispositivos a usuarios externos"""
    ESTADOS = [
        ('VIGENTE', 'Vigente'),
        ('DEVUELTO', 'Devuelto'),
        ('VENCIDO', 'Vencido'),
    ]
    
    usuario = models.ForeignKey(UsuarioExterno, on_delete=models.CASCADE, related_name='asignaciones')
    dispositivo = models.ForeignKey(Dispositivo, on_delete=models.CASCADE, related_name='asignaciones_externas')
    fecha_asignacion = models.DateTimeField(auto_now_add=True)
    fecha_devolucion = models.DateTimeField(null=True, blank=True)
    estado = models.CharField(max_length=10, choices=ESTADOS, default='VIGENTE')
    ubicacion_asignada = models.CharField(
        max_length=20,
        choices=Dispositivo.UBICACIONES,
        default='CASA',
        help_text="Ubicación donde se usará el dispositivo"
    )
    observaciones = models.TextField(blank=True, null=True)
    asignado_por = models.ForeignKey(
        'RolUser',  # Aquí sí usamos RolUser para saber quién hizo la asignación
        on_delete=models.SET_NULL,
        null=True,
        related_name='asignaciones_realizadas'
    )
    
    class Meta:
        verbose_name = 'Asignación de Dispositivo'
        verbose_name_plural = 'Asignaciones de Dispositivos'
        ordering = ['-fecha_asignacion']
        constraints = [
            models.UniqueConstraint(
                fields=['usuario', 'dispositivo'],
                condition=models.Q(estado='VIGENTE'),
                name='unique_vigente_usuario_dispositivo'
            )
        ]
    
    def __str__(self):
        return f"{self.dispositivo} asignado a {self.usuario} ({self.get_estado_display()})"
    
    def clean(self):
        # Validar que el dispositivo no esté asignado a otro usuario
        if self.estado == 'VIGENTE' and self.pk is None:
            asignaciones_vigentes = AsignacionDispositivo.objects.filter(
                dispositivo=self.dispositivo,
                estado='VIGENTE'
            ).exclude(pk=self.pk if self.pk else None)
            
            if asignaciones_vigentes.exists():
                raise ValidationError("Este dispositivo ya está asignado a otro usuario")
        
        # Validar que la ubicación sea válida para asignación
        if self.ubicacion_asignada not in ['CASA', 'CLIENTE']:
            raise ValidationError("La ubicación asignada debe ser 'Casa' o 'Cliente' para asignaciones externas")

class RegistroMovimientoDispositivo(models.Model):
    """Modelo para registrar entradas y salidas de dispositivos asignados"""
    TIPO_MOVIMIENTO = [
        ('ENTRADA', 'Entrada'),
        ('SALIDA', 'Salida'),
    ]
    
    asignacion = models.ForeignKey(
        AsignacionDispositivo,
        on_delete=models.CASCADE,
        related_name='movimientos'
    )
    tipo = models.CharField(max_length=7, choices=TIPO_MOVIMIENTO)
    fecha = models.DateField(auto_now_add=True)
    hora = models.TimeField(auto_now_add=True)
    observaciones = models.TextField(blank=True, null=True)
    registrado_por = models.ForeignKey(
        'RolUser',
        on_delete=models.SET_NULL,
        null=True,
        related_name='registros_movimientos'
    )
    
    class Meta:
        verbose_name = 'Registro de Movimiento'
        verbose_name_plural = 'Registros de Movimientos'
        ordering = ['-fecha', '-hora']
    
    def __str__(self):
        return f"{self.get_tipo_display()} - {self.asignacion.dispositivo} - {self.fecha} {self.hora}"
    
    def clean(self):
        # Validar que el movimiento sea coherente con el historial
        ultimo_movimiento = RegistroMovimientoDispositivo.objects.filter(
            asignacion=self.asignacion
        ).order_by('-fecha', '-hora').first()
        
        if ultimo_movimiento:
            if ultimo_movimiento.tipo == self.tipo:
                raise ValidationError(
                    f"No puede registrar dos {self.get_tipo_display().lower()}s consecutivas"
                )

@receiver(pre_save, sender=AsignacionDispositivo)
def actualizar_estado_dispositivo(sender, instance, **kwargs):
    """
    Actualiza el estado del dispositivo cuando se asigna o devuelve
    """
    if instance.estado == 'VIGENTE':
        instance.dispositivo.ubicacion = instance.ubicacion_asignada
        instance.dispositivo.estado_uso = 'EN_USO'
        instance.dispositivo.save()
    elif instance.estado in ['DEVUELTO', 'VENCIDO']:
        instance.dispositivo.ubicacion = 'SEDE'
        instance.dispositivo.estado_uso = 'DISPONIBLE'
        instance.dispositivo.save()