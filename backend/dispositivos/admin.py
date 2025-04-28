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