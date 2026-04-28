export class TextNormalizeHelper {
  static normalizeLooseText(value: string): string {
    const repaired = value
      .replace(/Ã³/g, "ó")
      .replace(/Ã²/g, "ò")
      .replace(/Ã¡/g, "á")
      .replace(/Ã /g, "à")
      .replace(/Ã¢/g, "â")
      .replace(/Ãª/g, "ê")
      .replace(/Ã´/g, "ô")
      .replace(/Æ¡/g, "ơ")
      .replace(/Æ°/g, "ư")
      .replace(/Ä‘/g, "đ")
      .replace(/áº¿/g, "ế")
      .replace(/á»‡/g, "ệ")
      .replace(/á»‹/g, "ị")
      .replace(/á»/g, "ỏ")
      .replace(/á»“/g, "ồ")
      .replace(/á»£/g, "ợ")
      .replace(/á»¯/g, "ữ")
      .replace(/á»­/g, "ử")
      .replace(/á»™/g, "ộ")
      .replace(/áº¥/g, "ấ")
      .replace(/áº¡/g, "ạ")
      .replace(/á»ƒ/g, "ể")
      .replace(/á»‰/g, "ỉ")
      .replace(/á»§/g, "ủ")
      .replace(/áº£/g, "ả")
      .replace(/á»±/g, "ự")
      .replace(/á»Ÿ/g, "ở");

    return repaired
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .replace(/đ/g, "d")
      .replace(/Đ/g, "D")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
  }
}
