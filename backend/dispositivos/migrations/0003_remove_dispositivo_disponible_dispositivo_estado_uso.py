# Generated by Django 5.1.5 on 2025-04-07 22:26

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('dispositivos', '0002_alter_posicion_dispositivos'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='dispositivo',
            name='disponible',
        ),
        migrations.AddField(
            model_name='dispositivo',
            name='estado_uso',
            field=models.CharField(choices=[('DISPONIBLE', 'Disponible'), ('EN_USO', 'En uso'), ('INHABILITADO', 'Inhabilitado')], default='DISPONIBLE', help_text='Indica si el dispositivo está disponible, en uso o inhabilitado', max_length=15),
        ),
    ]
