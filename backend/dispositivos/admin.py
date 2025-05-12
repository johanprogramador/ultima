from django.contrib import admin  # type: ignore
from django.contrib.auth.admin import UserAdmin
from .models import Sede, Servicios, Posicion, Dispositivo, Movimiento, Historial, RolUser

# Admin para RolUser
@admin.register(RolUser)
class RolUserAdmin(UserAdmin):
    list_display = ('username', 'rol', 'nombre', 'email', 'celular', 'documento', 'is_active', 'is_staff')
    search_fields = ('username', 'nombre', 'email', 'documento')
    list_filter = ('rol', 'is_active', 'is_staff', 'sedes')
    filter_horizontal = ('groups', 'user_permissions', 'sedes')

    fieldsets = (
        (None, {'fields': ('username', 'password')}),
        ('Información personal', {'fields': ('nombre', 'email', 'celular', 'documento')}),
        ('Rol y permisos', {'fields': ('rol', 'is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions', 'sedes')}),
        ('Fechas importantes', {'fields': ('last_login', 'date_joined')}),
    )

    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('username', 'password1', 'password2', 'email', 'nombre', 'celular', 'documento', 'rol', 'is_active', 'is_staff', 'sedes'),
        }),
    )

# Admin para Sede
@admin.register(Sede)
class SedeAdmin(admin.ModelAdmin):
    list_display = ('nombre', 'ciudad', 'direccion')
    search_fields = ('nombre', 'ciudad')
    list_filter = ('ciudad',)

# Admin para Servicios
@admin.register(Servicios)
class ServiciosAdmin(admin.ModelAdmin):
    list_display = ('nombre', 'codigo_analitico', 'get_sedes', 'color')
    list_filter = ('sedes',)

    def get_sedes(self, obj):
        return ", ".join([sede.nombre for sede in obj.sedes.all()])
    get_sedes.short_description = "Sedes"



# Admin para Dispositivo
# Admin para Dispositivo
@admin.register(Dispositivo)
class DispositivoAdmin(admin.ModelAdmin):
    
    list_display = ('tipo', 'marca', 'modelo', 'serial', 'razon_social', 'sede', 'estado', 'ubicacion')
    search_fields = ('serial', 'modelo', 'marca', 'razon_social')
    list_filter = ('tipo', 'estado', 'sede', 'razon_social', 'ubicacion')
    list_editable = ('estado',)
    ordering = ('modelo',)
    
    def save_model(self, request, obj, form, change):
        # Guardar primero el objeto para obtener un ID
        super().save_model(request, obj, form, change)
        # Luego guardar las relaciones many-to-many (como posiciones)
        form.save_m2m()
        
    def save_related(self, request, form, formsets, change):
        # Manejar el guardado de relaciones después del objeto principal
        super().save_related(request, form, formsets, change)
        # Aquí puedes añadir lógica adicional si es necesario

# Admin para Movimiento
@admin.register(Movimiento)
class MovimientoAdmin(admin.ModelAdmin):
    list_display = ('dispositivo', 'encargado', 'fecha_movimiento', 'posicion_origen', 'posicion_destino', 'sede')
    list_filter = ('fecha_movimiento', 'posicion_origen', 'posicion_destino', 'sede')
    search_fields = ('dispositivo__serial', 'dispositivo__modelo', 'encargado__username')
    date_hierarchy = 'fecha_movimiento'
    ordering = ('-fecha_movimiento',)

# Admin para Historial
@admin.register(Historial)
class HistorialAdmin(admin.ModelAdmin):
    list_display = ('dispositivo', 'usuario', 'fecha_modificacion', 'tipo_cambio', 'cambios')
    search_fields = ('dispositivo__serial', 'usuario__username', 'tipo_cambio')
    list_filter = ('fecha_modificacion', 'tipo_cambio')
    date_hierarchy = 'fecha_modificacion'
    
    

    
    
    # Admin para Posicion
# Admin para Posicion
@admin.register(Posicion)
class PosicionAdmin(admin.ModelAdmin):
    list_display = ('nombre', 'piso')
    search_fields = ('nombre',)
    list_filter = ('piso',)
    
    def save_model(self, request, obj, form, change):
        # Guardar primero el objeto para obtener un ID
        super().save_model(request, obj, form, change)
        # Luego guardar las relaciones many-to-many (como dispositivos)
        form.save_m2m()
        
        
from django.contrib import admin
from django import forms
from .models import (
    UsuarioExterno,
    AsignacionDispositivo,
    RegistroMovimientoDispositivo,
    Celador,
    Dispositivo
)

class UsuarioExternoAdminForm(forms.ModelForm):
    class Meta:
        model = UsuarioExterno
        fields = '__all__'
        widgets = {
            'observaciones': forms.Textarea(attrs={'rows': 3, 'cols': 40}),
        }

@admin.register(UsuarioExterno)
class UsuarioExternoAdmin(admin.ModelAdmin):
    form = UsuarioExternoAdminForm
    list_display = ('nombre_completo', 'tipo_documento', 'documento', 'cargo', 'empresa', 'activo')
    search_fields = ('nombre_completo', 'documento', 'cargo', 'empresa')
    list_filter = ('tipo_documento', 'activo', 'fecha_registro')
    ordering = ('nombre_completo',)
    readonly_fields = ('fecha_registro',)
    fieldsets = (
        ('Información Personal', {
            'fields': ('tipo_documento', 'documento', 'nombre_completo')
        }),
        ('Información Laboral', {
            'fields': ('cargo', 'empresa')
        }),
        ('Contacto', {
            'fields': ('telefono', 'email')
        }),
        ('Estado y Observaciones', {
            'fields': ('activo', 'observaciones', 'fecha_registro')
        }),
    )

class AsignacionDispositivoInline(admin.TabularInline):
    model = AsignacionDispositivo
    extra = 0
    fields = ('dispositivo', 'fecha_asignacion', 'estado', 'ubicacion_asignada')
    readonly_fields = ('fecha_asignacion',)
    show_change_link = True

class DispositivoFilter(admin.SimpleListFilter):
    title = 'Dispositivo'
    parameter_name = 'dispositivo'

    def lookups(self, request, model_admin):
        dispositivos = Dispositivo.objects.filter(asignaciones_externas__isnull=False).distinct()
        return [(d.id, f"{d.tipo} - {d.serial}") for d in dispositivos]

    def queryset(self, request, queryset):
        if self.value():
            return queryset.filter(dispositivo__id=self.value())

@admin.register(AsignacionDispositivo)
class AsignacionDispositivoAdmin(admin.ModelAdmin):
    list_display = ('usuario_info', 'dispositivo_info', 'fecha_asignacion', 'estado', 'ubicacion_asignada', 'asignado_por')
    search_fields = (
        'usuario__nombre_completo', 
        'usuario__documento',
        'dispositivo__serial',
        'dispositivo__modelo'
    )
    list_filter = ('estado', 'ubicacion_asignada', DispositivoFilter, 'fecha_asignacion')
    date_hierarchy = 'fecha_asignacion'
    raw_id_fields = ('usuario', 'dispositivo')
    readonly_fields = ('fecha_asignacion', 'asignado_por')
    
    fieldsets = (
        (None, {
            'fields': ('usuario', 'dispositivo', 'asignado_por')
        }),
        ('Estado y Ubicación', {
            'fields': ('estado', 'ubicacion_asignada', 'fecha_devolucion')
        }),
        ('Observaciones', {
            'fields': ('observaciones',)
        }),
    )

    def usuario_info(self, obj):
        return f"{obj.usuario.nombre_completo} ({obj.usuario.documento})"
    usuario_info.short_description = 'Usuario'
    
    def dispositivo_info(self, obj):
        return f"{obj.dispositivo.tipo} {obj.dispositivo.marca} - {obj.dispositivo.serial}"
    dispositivo_info.short_description = 'Dispositivo'

    def save_model(self, request, obj, form, change):
        if not obj.pk:
            obj.asignado_por = request.user
        super().save_model(request, obj, form, change)

class RegistroMovimientoDispositivoAdmin(admin.ModelAdmin):
    list_display = ('asignacion_info', 'tipo', 'fecha_hora', 'registrado_por')
    search_fields = (
        'asignacion__usuario__nombre_completo',
        'asignacion__usuario__documento',
        'asignacion__dispositivo__serial'
    )
    list_filter = ('tipo', 'fecha')
    date_hierarchy = 'fecha'
    raw_id_fields = ('asignacion', 'registrado_por')
    
    def asignacion_info(self, obj):
        return f"{obj.asignacion.usuario} - {obj.asignacion.dispositivo}"
    asignacion_info.short_description = 'Asignación'
    
    def fecha_hora(self, obj):
        return f"{obj.fecha} {obj.hora}"
    fecha_hora.short_description = 'Fecha y Hora'

    def save_model(self, request, obj, form, change):
        if not obj.pk:
            obj.registrado_por = request.user
        super().save_model(request, obj, form, change)

@admin.register(RegistroMovimientoDispositivo)
class RegistroMovimientoDispositivoAdmin(RegistroMovimientoDispositivoAdmin):
    pass

@admin.register(Celador)
class CeladorAdmin(admin.ModelAdmin):
    list_display = ('username', 'nombre', 'documento', 'email', 'is_active')
    list_filter = ('is_active',)
    search_fields = ('username', 'nombre', 'documento', 'email')
    
    def get_queryset(self, request):
        return super().get_queryset(request).filter(rol='celador')