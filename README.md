# CPE Campo — Avancargo

PWA mobile-first para carga de la Carta de Porte Electrónica en campo.

## Stack

- Vite + React + TypeScript
- Tailwind CSS
- Supabase (Auth + PostgreSQL)
- React Router v6
- Lucide React (íconos)
- Web Speech API (reconocimiento de voz en `es-AR`)

## Setup local

### 1. Clonar e instalar

```bash
git clone <repo>
cd cpe-campo
npm install
```

### 2. Variables de entorno

```bash
cp .env.example .env
```

Completar con las credenciales de tu proyecto Supabase:

```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

### 3. Base de datos Supabase

Ejecutar en el SQL Editor de Supabase:

```sql
-- Emails autorizados
create table authorized_emails (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  created_at timestamptz default now(),
  created_by text,
  is_admin boolean default false
);

-- Contador de IDs
create table id_counter (
  id int primary key default 1,
  counter int default 1
);
insert into id_counter (id, counter) values (1, 1);

-- Registros CPE
create table cpe_records (
  id uuid primary key default gen_random_uuid(),
  cpe_id text unique not null,
  fecha_carga date,
  campo text, localidad text, grano text, variedad text,
  destinatario text, cuit_destinatario text, destino text, cuit_destino text,
  rte_venta_primaria text, rte_venta_secundaria text, rte_venta_secundaria2 text,
  mercado_termino text, corredor_primario text, corredor_secundario text,
  repr_entregador text, repr_recibidor text,
  km numeric, tarifa numeric, pagador_flete text, cupo text,
  intermediario_flete text, cuil_intermediario text, observaciones text,
  transporte text, cuit_transporte text, chofer text, cuil_chofer text,
  chasis text, acoplado text,
  kg_bruto_cargados numeric, kg_tara_cargados numeric,
  kg_estimados numeric, kg_reales numeric,
  kg_bruto_descargados numeric, kg_tara_descargados numeric,
  nro_ruca text, ingeniero text, contacto text, gps text,
  status text default 'Enviado',
  created_by text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Log de auditoría
create table audit_log (
  id uuid primary key default gen_random_uuid(),
  record_id text not null,
  action text not null,
  user_email text not null,
  field_name text,
  old_value text,
  new_value text,
  created_at timestamptz default now()
);

-- RLS: habilitar y permitir acceso autenticado
alter table authorized_emails enable row level security;
alter table id_counter enable row level security;
alter table cpe_records enable row level security;
alter table audit_log enable row level security;

create policy "auth users" on authorized_emails for all using (auth.role() = 'authenticated');
create policy "auth users" on id_counter for all using (auth.role() = 'authenticated');
create policy "auth users" on cpe_records for all using (auth.role() = 'authenticated');
create policy "auth users" on audit_log for all using (auth.role() = 'authenticated');

-- Agregar primer admin
insert into authorized_emails (email, is_admin) values ('admin@avancargo.com', true);
```

### 4. Configurar Supabase Auth

En el dashboard de Supabase → Authentication → URL Configuration:
- **Site URL**: `https://tu-dominio.vercel.app`
- **Redirect URLs**: `https://tu-dominio.vercel.app/**`

Para desarrollo local también agregar `http://localhost:5173/**`.

### 5. Correr en desarrollo

```bash
npm run dev
```

## Deploy en Vercel

1. Importar el repo en Vercel
2. Agregar las env vars (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`)
3. El archivo `vercel.json` ya configura el rewrite para React Router

## Rutas

| Ruta | Descripción |
|------|-------------|
| `/login` | Autenticación por Magic Link |
| `/` | Home — lista de CPEs |
| `/nuevo` | Wizard de nueva carga (6 pasos) |
| `/registro/:id` | Detalle del registro (Datos + Historial) |
| `/registro/:id/editar` | Edición completa |
| `/admin` | Panel admin (solo admins) |
