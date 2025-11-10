shares = {
    "transport_road": 0.145,
    "industry_iron_steel": 0.095,
    "residential_heating": 0.125,
    "industry_chemicals": 0.08,
    "commercial_buildings": 0.105,
    "residential_appliances": 0.085,
    "industry_cement": 0.055,
    "transport_aviation": 0.05,
    "agriculture": 0.045,
    "industry_aluminum": 0.03,
    "transport_shipping": 0.035,
    "industry_pulp_paper": 0.035,
    "residential_cooling": 0.05,
    "transport_rail": 0.02,
    "other_industry": 0.145
}

total = sum(shares.values())
print(f"Total shares: {total:.6f}")
print(f"Error: {(total-1.0)*100:.2f}%")
print(f"\nShares sum to {total*100:.2f}% instead of 100%")

print("\nNormalized shares:")
for sector, share in shares.items():
    normalized = share / total
    print(f"{sector:25s}: {share:.3f} -> {normalized:.3f}")
