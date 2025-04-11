from django.db import models # type: ignore
from django.contrib.auth.models import AbstractUser # type: ignore
from django.db.models.signals import post_save # type: ignore
from django.dispatch import receiver # type: ignore
from django.conf import settings # type: ignore
from django.core.exceptions import ValidationError
from django.core.validators import RegexValidator
import re
from colorfield.fields import ColorField  # type: ignore
from django.utils.translation import gettext_lazy as _
from django.contrib.postgres.fields import JSONField
from django.db.models.signals import post_save, pre_save,  post_delete
from django.db import transaction
from django.contrib.auth.signals import user_logged_in
from django.utils.timezone import now, timedelta
from django.utils import timezone

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
        # Ejecuta las validaciones antes de guardar (opcional, puedes comentarlo si da problemas)
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
    codigo_analitico = models.CharField(max_length=255, null=True, blank=True)  
    sedes = models.ManyToManyField('Sede', related_name="servicios")
    color = ColorField(default="#FFFFFF")  # Campo de color con selector en Django Admin

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
    sede = models.ForeignKey(Sede, on_delete=models.CASCADE, related_name="posiciones", null=True, blank=True)
    servicio = models.ForeignKey(Servicios, on_delete=models.SET_NULL, related_name="posiciones", null=True, blank=True)
    dispositivos = models.ManyToManyField('Dispositivo', related_name='posiciones')
    mergedCells = models.JSONField(default=list)  # Corregido: JSONField en lugar de lista

    def __str__(self):
        return f"{self.nombre} - Piso {self.piso}"

    def clean(self):
        if self.fila < 1:
            raise ValidationError("La fila debe ser un número positivo.")
        if not self.columna.isalpha():
            raise ValidationError("La columna debe contener solo letras.")

    def save(self, *args, **kwargs):
        self.clean()
        super().save(*args, **kwargs)



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
    ('MACOS', 'MacOS'),  # Agregado MacOS como opción válida
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
    
    # Razon Social como un atributo de tipo CharField
    regimen = models.CharField(max_length=100, null=True, blank=True)
    razon_social = models.CharField(max_length=100, choices=RAZONES_SOCIALES, null=True, blank=True)
    modelo = models.CharField(max_length=50, db_index=True)
    serial = models.CharField(max_length=50, unique=True, db_index=True)
    placa_cu = models.CharField(max_length=50, unique=True, null=True, blank=True)

    piso = models.CharField(max_length=10, null=True, blank=True)  # Se extrae de la posición
    estado_propiedad = models.CharField(max_length=10, choices=ESTADOS_PROPIEDAD, null=True, blank=True)
    # Clave foránea a Posicion con related_name para evitar conflicto
    posicion = models.ForeignKey(Posicion, on_delete=models.SET_NULL, null=True, blank=True, related_name='dispositivos_relacionados')
    sede = models.ForeignKey('Sede', on_delete=models.SET_NULL, null=True, blank=True, related_name="dispositivos", db_index=True)
    capacidad_disco_duro = models.CharField(max_length=10, choices=CAPACIDADES_DISCO_DURO, null=True, blank=True)
    capacidad_memoria_ram = models.CharField(max_length=10, choices=CAPACIDADES_MEMORIA_RAM, null=True, blank=True)
    ubicacion = models.CharField(max_length=10, choices=UBICACIONES, null=True, blank=True)
    proveedor = models.CharField(max_length=100, null=True, blank=True)  # Nombre del proveedor
    sistema_operativo = models.CharField(max_length=20, choices=SISTEMAS_OPERATIVOS, null=True, blank=True)  # Sistema operativo instalado
    procesador = models.CharField(max_length=100, choices=PROCESADORES, null=True, blank=True)
    estado_uso = models.CharField(max_length=100, choices=ESTADO_USO, null=True, blank=True)
    observaciones = models.TextField(max_length=500, null=True, blank=True, verbose_name="Observaciones adicionales")
    
    def __str__(self):
        return f"{self.tipo} {self.marca} {self.modelo} - {self.serial}"

    def is_operativo(self):
        return self.estado_uso == 'EN_USO' and self.estado == 'BUENO'


"""historico"""
class Historial(models.Model):
    class TipoCambio(models.TextChoices):  
        CREACION = 'CREACION', _('Creación de dispositivo')
        MODIFICACION = 'MODIFICACION', _('Modificación de datos')
        ASIGNACION = 'ASIGNACION', _('Cambio de usuario asignado')
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


# MODELO DE MOVIMIENTO
class Movimiento(models.Model):
    UBICACIONES = [
        ('CASA', 'Casa'),
        ('CLIENTE', 'Cliente'),
        ('SEDE', 'Sede'),
        ('OTRO', 'Otro'),
    ]

    dispositivo = models.ForeignKey('Dispositivo', on_delete=models.CASCADE, related_name="movimientos")
    encargado = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="movimientos")
    fecha_movimiento = models.DateTimeField(auto_now_add=True)
    ubicacion_origen = models.CharField(max_length=50, choices=UBICACIONES)
    ubicacion_destino = models.CharField(max_length=50, choices=UBICACIONES)
    observacion = models.TextField(null=True, blank=True)

    def save(self, *args, **kwargs):
        if self.ubicacion_origen == self.ubicacion_destino:
            raise ValidationError("La ubicación de origen y destino no pueden ser iguales.")

        if not self.observacion:
            self.observacion = (
                f"Dispositivo {self.dispositivo.serial} ({self.dispositivo.marca} {self.dispositivo.modelo}) "
                f"movido de {self.get_ubicacion_origen_display()} a {self.get_ubicacion_destino_display()} "
                f"por {self.encargado.get_full_name() if self.encargado else 'Desconocido'}."
            )

        super().save(*args, **kwargs)

    def __str__(self):
        return f"Movimiento de {self.dispositivo.serial} - {self.fecha_movimiento.strftime('%Y-%m-%d %H:%M:%S')}"

    class Meta:
        verbose_name = "Movimiento"
        verbose_name_plural = "Movimientos"


@receiver(post_save, sender=Movimiento)
def handle_movimiento_post_save(sender, instance, created, **kwargs):
    if created:
        dispositivo = instance.dispositivo
        usuario = instance.encargado
        sede = dispositivo.posicion.sede.nombre if dispositivo.posicion and dispositivo.posicion.sede else None

        cambios = (
            f"El dispositivo {dispositivo.serial} ({dispositivo.marca} {dispositivo.modelo}) "
            f"fue movido de {instance.ubicacion_origen} a {instance.ubicacion_destino} "
            f"por {usuario.get_full_name() if usuario else 'Desconocido'}."
        )

        transaction.on_commit(lambda: Historial.objects.create(
            dispositivo=dispositivo,
            usuario=usuario,
            cambios={"detalle": cambios},
            tipo_cambio=Historial.TipoCambio.MOVIMIENTO,
            modelo_afectado="Movimiento",
            instancia_id=instance.id,
            sede_nombre=sede
        ))


# GUARDAR ESTADO ANTERIOR
@receiver(pre_save, sender=Dispositivo)
def guardar_estado_anterior(sender, instance, **kwargs):
    if instance.pk:
        try:
            instance._estado_anterior = Dispositivo.objects.get(pk=instance.pk)
        except Dispositivo.DoesNotExist:
            instance._estado_anterior = None


# REGISTRAR CAMBIOS (CREACIÓN Y MODIFICACIONES)
@receiver(post_save, sender=Dispositivo)
def registrar_cambios_historial(sender, instance, created, **kwargs):
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
            usuario=instance.usuario_asignado,
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
            usuario=instance.usuario_asignado,
            cambios=cambios,
            tipo_cambio=Historial.TipoCambio.MODIFICACION,
            modelo_afectado="Dispositivo",
            instancia_id=instance.id,
            sede_nombre=sede
        )


# REGISTRAR MOVIMIENTO AUTOMÁTICO SI CAMBIA POSICIÓN
@receiver(post_save, sender=Dispositivo)
def registrar_movimiento(sender, instance, **kwargs):
    dispositivo_anterior = sender.objects.filter(pk=instance.pk).first()
    posicion_anterior = dispositivo_anterior.posicion if dispositivo_anterior else None

    if posicion_anterior == instance.posicion:
        return

    ubicacion_origen = posicion_anterior.nombre if posicion_anterior else "Desconocido"
    ubicacion_destino = instance.posicion.nombre if instance.posicion else "Desconocido"

    encargado = instance.usuario_asignado
    if not encargado and instance.posicion and instance.posicion.sede:
        encargado = instance.posicion.sede.usuarios_asignados.first()
    if not encargado:
        encargado = RolUser.objects.filter(rol='admin').first()

    if instance.posicion:
        Movimiento.objects.create(
            dispositivo=instance,
            ubicacion_origen=ubicacion_origen,
            ubicacion_destino=ubicacion_destino,
            encargado=encargado,
        )


# REGISTRAR INICIO DE SESIÓN
@receiver(user_logged_in)
def registrar_login(sender, request, user, **kwargs):
    sede = getattr(user, 'sede', None)
    hace_un_minuto = now() - timedelta(minutes=1)

    if Historial.objects.filter(
        usuario=user,
        tipo_cambio=Historial.TipoCambio.LOGIN,
        fecha_modificacion__gte=hace_un_minuto
    ).exists():
        return  # Ya se registró un login recientemente

    Historial.objects.create(
        usuario=user,
        cambios={"mensaje": "Inicio de sesión exitoso"},
        tipo_cambio=Historial.TipoCambio.LOGIN,
        modelo_afectado="Usuario",
        instancia_id=user.id,
        sede_nombre=str(sede) if sede else None
    )
# REGISTRAR ELIMINACIÓN
@receiver(post_delete)
def registrar_eliminacion(sender, instance, **kwargs):
    if sender.__name__ in ['Dispositivo', 'Movimiento', 'RolUser', 'Usuario']:
        sede = None
        usuario = getattr(instance, 'usuario_asignado', None) or getattr(instance, 'usuario', None)

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
