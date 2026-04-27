# Test Data

`test-data/` chua 2 nhom thu dung chung cho test:

- `files/`: file fixture that cho upload va validation.
- `*.ts`: helper/scenario bootstrap du lieu dung lai giua nhieu spec, gom temp profile, invoice, property request va E2E session.

Quy uoc ngan gon:
- File input mau dat trong `test-data/files/`.
- Helper tao temp user, temp invoice, property request scenario va E2E session dat trong `test-data/*.ts`.
- Utility tong quat cap framework thi dat trong `utils/helpers/`.
