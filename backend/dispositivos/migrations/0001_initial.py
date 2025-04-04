# Generated by Django 5.1.5 on 2025-03-28 22:20

import colorfield.fields
import django.contrib.auth.models
import django.contrib.auth.validators
import django.core.validators
import django.db.models.deletion
import django.utils.timezone
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('auth', '0012_alter_user_first_name_max_length'),
    ]

    operations = [
        migrations.CreateModel(
            name='Sede',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('nombre', models.CharField(max_length=100, unique=True)),
                ('ciudad', models.CharField(max_length=100)),
                ('direccion', models.TextField()),
            ],
            options={
                'verbose_name': 'Sede',
                'verbose_name_plural': 'Sedes',
            },
        ),
        migrations.CreateModel(
            name='RolUser',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('password', models.CharField(max_length=128, verbose_name='password')),
                ('last_login', models.DateTimeField(blank=True, null=True, verbose_name='last login')),
                ('is_superuser', models.BooleanField(default=False, help_text='Designates that this user has all permissions without explicitly assigning them.', verbose_name='superuser status')),
                ('username', models.CharField(error_messages={'unique': 'A user with that username already exists.'}, help_text='Required. 150 characters or fewer. Letters, digits and @/./+/-/_ only.', max_length=150, unique=True, validators=[django.contrib.auth.validators.UnicodeUsernameValidator()], verbose_name='username')),
                ('first_name', models.CharField(blank=True, max_length=150, verbose_name='first name')),
                ('last_name', models.CharField(blank=True, max_length=150, verbose_name='last name')),
                ('is_staff', models.BooleanField(default=False, help_text='Designates whether the user can log into this admin site.', verbose_name='staff status')),
                ('is_active', models.BooleanField(default=True, help_text='Designates whether this user should be treated as active. Unselect this instead of deleting accounts.', verbose_name='active')),
                ('date_joined', models.DateTimeField(default=django.utils.timezone.now, verbose_name='date joined')),
                ('rol', models.CharField(choices=[('admin', 'Administrador'), ('coordinador', 'Coordinador')], default='administrador', max_length=15)),
                ('nombre', models.CharField(blank=True, max_length=150, null=True, verbose_name='Nombre completo')),
                ('celular', models.CharField(blank=True, max_length=15, null=True, validators=[django.core.validators.RegexValidator(message='Número de celular inválido', regex='^\\+?\\d{7,15}$')], verbose_name='Celular')),
                ('documento', models.CharField(blank=True, max_length=50, null=True, unique=True, verbose_name='Documento de identificación')),
                ('email', models.EmailField(max_length=254, unique=True, verbose_name='Correo electrónico')),
                ('groups', models.ManyToManyField(blank=True, help_text='Los grupos a los que pertenece este usuario.', related_name='custom_user_set', related_query_name='custom_user', to='auth.group')),
                ('user_permissions', models.ManyToManyField(blank=True, help_text='Permisos específicos para este usuario.', related_name='custom_user_set', related_query_name='custom_user', to='auth.permission')),
                ('sedes', models.ManyToManyField(blank=True, related_name='usuarios_asignados', to='dispositivos.sede')),
            ],
            options={
                'verbose_name': 'Usuario',
                'verbose_name_plural': 'Usuarios',
                'ordering': ['id'],
            },
            managers=[
                ('objects', django.contrib.auth.models.UserManager()),
            ],
        ),
        migrations.CreateModel(
            name='Dispositivo',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('tipo', models.CharField(choices=[('COMPUTADOR', 'Computador'), ('DESKTOP', 'Desktop'), ('MONITOR', 'Monitor'), ('TABLET', 'Tablet'), ('MOVIL', 'Celular')], max_length=17)),
                ('estado', models.CharField(blank=True, choices=[('REPARAR', 'En reparación'), ('BUENO', 'Buen estado'), ('PERDIDO', 'Perdido/robado'), ('COMPRADO', 'Comprado'), ('MALO', 'Mal estado')], max_length=10, null=True)),
                ('marca', models.CharField(choices=[('DELL', 'Dell'), ('HP', 'HP'), ('LENOVO', 'Lenovo'), ('APPLE', 'Apple'), ('SAMSUNG', 'Samsung')], db_index=True, max_length=20)),
                ('razon_social', models.CharField(blank=True, max_length=100, null=True)),
                ('regimen', models.CharField(blank=True, choices=[('ECCC', 'ECCC'), ('ECOL', 'ECOL'), ('CNC', 'CNC')], max_length=10, null=True)),
                ('modelo', models.CharField(db_index=True, max_length=50)),
                ('serial', models.CharField(db_index=True, max_length=50, unique=True)),
                ('placa_cu', models.CharField(blank=True, max_length=50, null=True, unique=True)),
                ('piso', models.CharField(blank=True, max_length=10, null=True)),
                ('estado_propiedad', models.CharField(blank=True, choices=[('PROPIO', 'Propio'), ('ARRENDADO', 'Arrendado'), ('DONADO', 'Donado'), ('OTRO', 'Otro')], max_length=10, null=True)),
                ('tipo_disco_duro', models.CharField(blank=True, choices=[('HDD', 'HDD (Disco Duro Mecánico)'), ('SSD', 'SSD (Disco de Estado Sólido)'), ('HYBRID', 'Híbrido (HDD + SSD)')], max_length=10, null=True)),
                ('capacidad_disco_duro', models.CharField(blank=True, choices=[('120GB', '120 GB'), ('250GB', '250 GB'), ('500GB', '500 GB'), ('1TB', '1 TB'), ('2TB', '2 TB'), ('4TB', '4 TB'), ('8TB', '8 TB')], max_length=10, null=True)),
                ('tipo_memoria_ram', models.CharField(blank=True, choices=[('DDR', 'DDR'), ('DDR2', 'DDR2'), ('DDR3', 'DDR3'), ('DDR4', 'DDR4'), ('LPDDR4', 'LPDDR4'), ('LPDDR5', 'LPDDR5')], max_length=10, null=True)),
                ('capacidad_memoria_ram', models.CharField(blank=True, choices=[('2GB', '2 GB'), ('4GB', '4 GB'), ('8GB', '8 GB'), ('16GB', '16 GB'), ('32GB', '32 GB'), ('64GB', '64 GB')], max_length=10, null=True)),
                ('ubicacion', models.CharField(blank=True, choices=[('CASA', 'Casa'), ('CLIENTE', 'Cliente'), ('SEDE', 'Sede'), ('OTRO', 'Otro')], max_length=10, null=True)),
                ('proveedor', models.CharField(blank=True, max_length=100, null=True)),
                ('sistema_operativo', models.CharField(blank=True, choices=[('NA', 'No Aplica'), ('SERVER', 'Server'), ('WIN10', 'Windows 10'), ('WIN11', 'Windows 11'), ('WIN7', 'Windows 7'), ('VACIO', 'Sin Sistema Operativo'), ('MACOS', 'MacOS')], max_length=20, null=True)),
                ('procesador', models.CharField(blank=True, choices=[('AMD_A12', 'AMD A12'), ('AMD_A8_5500B', 'AMD A8-5500B APU'), ('AMD_RYZEN', 'AMD RYZEN'), ('AMD_RYZEN_3_2200GE', 'AMD Ryzen 3 2200GE'), ('I3_2100', 'Intel Core i3 2100'), ('I3_6200U', 'Intel Core i3 6200U'), ('I5_4430S', 'Intel Core i5 4430s'), ('I5_4460', 'Intel Core i5 4460'), ('I5_4590', 'Intel Core i5 4590'), ('I5_4600', 'Intel Core i5 4600'), ('I5_4670', 'Intel Core i5 4670'), ('I5_4750', 'Intel Core i5 4750'), ('I5_6500', 'Intel Core i5 6500'), ('I5_6500T', 'Intel Core i5 6500T'), ('I5_7500', 'Intel Core i5 7500'), ('I5_8400T', 'Intel Core i5 8400T'), ('I5_8500', 'Intel Core i5 8500'), ('I5_10TH', 'Intel Core i5 10th Gen'), ('I5_11TH', 'Intel Core i5 11th Gen'), ('I5_12TH', 'Intel Core i5 12th Gen'), ('I7_8TH', 'Intel Core i7 8th Gen'), ('I7_12TH', 'Intel Core i7 12th Gen'), ('I7_13TH', 'Intel Core i7 13th Gen'), ('I7_7TH', 'Intel Core i7 7th Gen'), ('I7_8565U', 'Intel Core i7 8565U @ 1.80GHz'), ('CORE_2_DUO_E7400', 'Intel Core 2 Duo E7400'), ('CORE_2_DUO_E7500', 'Intel Core 2 Duo E7500')], max_length=100, null=True)),
                ('disponible', models.BooleanField(default=True)),
                ('usuario_asignado', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='dispositivos_asignados', to=settings.AUTH_USER_MODEL)),
            ],
        ),
        migrations.CreateModel(
            name='Historial',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('fecha_modificacion', models.DateTimeField(auto_now_add=True)),
                ('cambios', models.JSONField(blank=True, null=True)),
                ('tipo_cambio', models.CharField(choices=[('MOVIMIENTO', 'Movimiento registrado'), ('MODIFICACION', 'Modificación de datos'), ('ASIGNACION', 'Cambio de usuario asignado'), ('OTRO', 'Otro')], default='MODIFICACION', max_length=20)),
                ('dispositivo', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='historial', to='dispositivos.dispositivo')),
                ('usuario', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name': 'Historial',
                'verbose_name_plural': 'Historiales',
                'ordering': ['-fecha_modificacion'],
            },
        ),
        migrations.CreateModel(
            name='Movimiento',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('fecha_movimiento', models.DateTimeField(auto_now_add=True)),
                ('ubicacion_origen', models.CharField(choices=[('CASA', 'Casa'), ('CLIENTE', 'Cliente'), ('SEDE', 'Sede'), ('OTRO', 'Otro')], max_length=50)),
                ('ubicacion_destino', models.CharField(choices=[('CASA', 'Casa'), ('CLIENTE', 'Cliente'), ('SEDE', 'Sede'), ('OTRO', 'Otro')], max_length=50)),
                ('observacion', models.TextField(blank=True, null=True)),
                ('dispositivo', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='movimientos', to='dispositivos.dispositivo')),
                ('encargado', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='movimientos', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name': 'Movimiento',
                'verbose_name_plural': 'Movimientos',
            },
        ),
        migrations.CreateModel(
            name='Posicion',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('nombre', models.CharField(blank=True, max_length=100, null=True)),
                ('tipo', models.CharField(blank=True, max_length=50, null=True)),
                ('estado', models.CharField(choices=[('disponible', 'Disponible'), ('ocupado', 'Ocupado'), ('reservado', 'Reservado'), ('inactivo', 'Inactivo')], default='disponible', max_length=50)),
                ('detalles', models.TextField(blank=True, null=True)),
                ('fila', models.IntegerField()),
                ('columna', models.CharField(max_length=5)),
                ('color', models.CharField(default='#FFFFFF', max_length=20)),
                ('colorFuente', models.CharField(default='#000000', max_length=20)),
                ('colorOriginal', models.CharField(blank=True, max_length=50, null=True)),
                ('borde', models.BooleanField(default=True)),
                ('bordeDoble', models.BooleanField(default=False)),
                ('bordeDetalle', models.JSONField(default=dict)),
                ('piso', models.CharField(max_length=50)),
                ('mergedCells', models.JSONField(default=list)),
                ('dispositivos', models.ManyToManyField(related_name='posiciones', to='dispositivos.dispositivo')),
                ('sede', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='posiciones', to='dispositivos.sede')),
            ],
        ),
        migrations.AddField(
            model_name='dispositivo',
            name='posicion',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='dispositivos_relacionados', to='dispositivos.posicion'),
        ),
        migrations.AddField(
            model_name='dispositivo',
            name='sede',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='dispositivos', to='dispositivos.sede'),
        ),
        migrations.CreateModel(
            name='Servicios',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('nombre', models.CharField(max_length=100)),
                ('codigo_analitico', models.CharField(blank=True, max_length=255, null=True)),
                ('color', colorfield.fields.ColorField(default='#FFFFFF', image_field=None, max_length=25, samples=None)),
                ('sedes', models.ManyToManyField(related_name='servicios', to='dispositivos.sede')),
            ],
            options={
                'verbose_name': 'Servicios',
                'verbose_name_plural': 'Servicios',
            },
        ),
        migrations.AddField(
            model_name='posicion',
            name='servicio',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='posiciones', to='dispositivos.servicios'),
        ),
        migrations.AddField(
            model_name='dispositivo',
            name='servicio',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='dispositivos', to='dispositivos.servicios'),
        ),
    ]
