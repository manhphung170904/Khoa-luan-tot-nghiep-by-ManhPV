package com.estate.util;

import java.math.BigDecimal;

public class MoneyToWords {

    private static final String[] UNITS = {
            "", "một", "hai", "ba", "bốn", "năm", "sáu", "bảy", "tám", "chín"
    };
    private static final String[] TEENS = {
            "mười", "mười một", "mười hai", "mười ba", "mười bốn",
            "mười lăm", "mười sáu", "mười bảy", "mười tám", "mười chín"
    };
    private static final String[] TENS = {
            "", "mười", "hai mươi", "ba mươi", "bốn mươi", "năm mươi",
            "sáu mươi", "bảy mươi", "tám mươi", "chín mươi"
    };
    private static final String[] GROUPS = { "", "nghìn", "triệu", "tỷ" };

    public static String convert(BigDecimal amount) {
        if (amount == null) return "";
        long number = amount.longValue();
        if (number == 0) return "Không đồng";

        String result = convertNumber(number).trim();
        // Viết hoa chữ đầu
        return Character.toUpperCase(result.charAt(0)) + result.substring(1) + " đồng";
    }

    private static String convertNumber(long number) {
        if (number == 0) return "không";
        if (number < 0)  return "âm " + convertNumber(-number);

        StringBuilder sb = new StringBuilder();
        int groupIndex = 0;
        long remaining = number;

        // Tách từng nhóm 3 chữ số từ phải sang trái
        long[] groups = new long[4];
        while (remaining > 0) {
            groups[groupIndex++] = remaining % 1000;
            remaining /= 1000;
        }

        for (int i = groupIndex - 1; i >= 0; i--) {
            if (groups[i] == 0) continue;
            sb.append(convertThreeDigits(groups[i], i < groupIndex - 1));
            if (!GROUPS[i].isEmpty()) sb.append(" ").append(GROUPS[i]);
            sb.append(" ");
        }

        return sb.toString().trim();
    }

    private static String convertThreeDigits(long n, boolean hasHigherGroup) {
        StringBuilder sb = new StringBuilder();
        int hundreds = (int) (n / 100);
        int remainder = (int) (n % 100);

        if (hundreds > 0) {
            sb.append(UNITS[hundreds]).append(" trăm");
            if (remainder > 0 && remainder < 10) sb.append(" linh");
        } else if (hasHigherGroup && remainder > 0) {
            sb.append("không trăm");
            if (remainder < 10) sb.append(" linh");
        }

        if (remainder > 0) {
            if (!sb.isEmpty()) sb.append(" ");
            if (remainder < 10) {
                sb.append(UNITS[remainder]);
            } else if (remainder < 20) {
                sb.append(TEENS[remainder - 10]);
            } else {
                int tens = remainder / 10;
                int units = remainder % 10;
                sb.append(TENS[tens]);
                if (units == 1) sb.append(" mốt");
                else if (units == 5) sb.append(" lăm");
                else if (units > 0) sb.append(" ").append(UNITS[units]);
            }
        }

        return sb.toString().trim();
    }
}