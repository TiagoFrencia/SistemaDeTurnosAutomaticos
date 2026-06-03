alter table business_branding
  add column if not exists logo_url text null;

alter table business_branding
  add constraint business_branding_logo_url_check
  check (
    logo_url is null
    or logo_url ~* '^https?://.+'
  )
  not valid;

alter table business_branding
  validate constraint business_branding_logo_url_check;
