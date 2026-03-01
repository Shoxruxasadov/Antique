-- Login qilmagan userlar snaps bucket ga rasm yuklashi uchun (path: snaps/anonymous/*).
-- Supabase Dashboard → SQL Editor da barcha blokni bir martada ishga tushiring.
-- Shuningdek: Storage → snaps → bucket Public bo‘lishi kerak (rasmlar brauzer/app da ochilishi uchun).

-- 1) Eski policy bo‘lsa o‘chirish (qayta ishga tushirsangiz xato bermasligi uchun)
drop policy if exists "Allow anon uploads to snaps/anonymous" on storage.objects;

-- 2) Anon (login qilmagan) faqat snaps/anonymous/* ga INSERT qilishi mumkin
create policy "Allow anon uploads to snaps/anonymous"
on storage.objects
for insert
to anon
with check (
  bucket_id = 'snaps'
  and (storage.foldername(name))[1] = 'anonymous'
);

-- 3) O‘qish: bucket Public bo‘lmasa, anon uchun select policy (ixtiyoriy)
-- create policy "Public read snaps" on storage.objects for select to anon using (bucket_id = 'snaps');
