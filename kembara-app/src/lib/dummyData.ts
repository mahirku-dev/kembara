export const CATS: Record<
  string,
  { label: string; iconName: string; color: string }
> = {
  flight:  { label: "Penerbangan", iconName: "AirplaneTakeoff", color: "bg-brand-50 text-brand-600" },
  bus:     { label: "Bus",         iconName: "Bus",              color: "bg-stone-100 text-stone-600" },
  train:   { label: "Kereta",      iconName: "Train",            color: "bg-stone-100 text-stone-600" },
  car:     { label: "Mobil",       iconName: "Car",              color: "bg-stone-100 text-stone-600" },
  transit: { label: "Transit",     iconName: "ArrowsLeftRight",  color: "bg-stone-100 text-stone-600" },
  hotel:   { label: "Hotel",       iconName: "Bed",              color: "bg-peach-50 text-peach-600" },
  food:    { label: "Resto",       iconName: "ForkKnife",        color: "bg-orange-50 text-orange-600" },
  pray:    { label: "Ibadah",      iconName: "Mosque",           color: "bg-emerald-50 text-emerald-600" },
  explore: { label: "Ziarah",      iconName: "Compass",          color: "bg-blue-50 text-blue-600" },
};
