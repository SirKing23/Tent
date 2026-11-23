import { Text, View } from "react-native";

import {
  formatCurrencyAbsolute,
  formatCurrencyWithSign,
} from "../../../utils/currency";
import type { CashbookTotals as CashbookTotalsValue } from "../logic/cashbookCalculations";

export function CashbookTotals({ totals }: { totals: CashbookTotalsValue }) {
  return (
    <View className="mt-3 flex-row gap-2">
      <View className="flex-1 rounded-xl bg-emerald-50 px-2.5 py-2">
        <Text className="text-[10px] font-semibold uppercase text-emerald-700">
          Total cash in
        </Text>
        <Text
          className="mt-1 text-sm font-bold text-emerald-800"
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.65}
        >
          {formatCurrencyAbsolute(totals.totalCashIn)}
        </Text>
      </View>
      <View className="flex-1 rounded-xl bg-rose-50 px-2.5 py-2">
        <Text className="text-[10px] font-semibold uppercase text-rose-700">
          Total cash out
        </Text>
        <Text
          className="mt-1 text-sm font-bold text-rose-800"
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.65}
        >
          {formatCurrencyAbsolute(totals.totalCashOut)}
        </Text>
      </View>
      <View className="flex-1 rounded-xl bg-slate-100 px-2.5 py-2">
        <Text className="text-[10px] font-semibold uppercase text-slate-500">
          Balance
        </Text>
        <Text
          className={`mt-1 text-sm font-bold ${totals.balance > 0 ? "text-emerald-700" : totals.balance < 0 ? "text-rose-700" : "text-slate-600"}`}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.65}
        >
          {formatCurrencyWithSign(totals.balance)}
        </Text>
      </View>
    </View>
  );
}
