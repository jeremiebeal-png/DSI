-- CAPEX : un superviseur ne voit / modifie que le CAPEX de son hôtel actif (profiles.hotel_id).
-- Appliqué le 25/11/2026. Les admins gardent l'accès complet (capex_admin_all).
drop policy if exists capex_groupe_select on public.capex;
drop policy if exists capex_groupe_insert on public.capex;
drop policy if exists capex_groupe_update on public.capex;
create policy capex_hotel_select on public.capex for select to authenticated
  using ((select public."current_role"()) = 'supervisor' and hotel_id = (select public.current_hotel_id()));
create policy capex_hotel_insert on public.capex for insert to authenticated
  with check ((select public."current_role"()) = 'supervisor' and hotel_id = (select public.current_hotel_id()));
create policy capex_hotel_update on public.capex for update to authenticated
  using ((select public."current_role"()) = 'supervisor' and hotel_id = (select public.current_hotel_id()))
  with check ((select public."current_role"()) = 'supervisor' and hotel_id = (select public.current_hotel_id()));
