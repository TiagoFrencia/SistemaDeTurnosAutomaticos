alter table business_branding
  add column if not exists theme_preset text not null default 'editorial_green';

alter table business_branding
  drop constraint if exists business_branding_theme_preset_check;

alter table business_branding
  add constraint business_branding_theme_preset_check
  check (theme_preset in ('editorial_green', 'soft_rose', 'warm_terracotta', 'calm_blue', 'minimal_dark'));
