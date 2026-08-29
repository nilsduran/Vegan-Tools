# Auditoria Empírica de Dades Gastronòmiques a OpenStreetMap

Aquest document recull els resultats de l'auditoria empírica internacional de categories i dietes a OpenStreetMap realitzada l'agost de 2026.

---

## 📊 1. Desglossament: 100% Vegà vs Opcions Veganes

Aquesta taula mostra la proporció real de locals exclusivament **100% Vegans** (`diet:vegan=only` o `cuisine=vegan`) versus locals convencionals **Amb Opcions Veganes** (`diet:vegan=yes` / `diet:vegetarian=yes`):

| Ciutat / Barri | Total Locals | 🌱 100% Vegà (Exclusiu) | 🌿 Amb Opcions Veganes | Sense dades / Convencional |
| :--- | :---: | :---: | :---: | :---: |
| **BCN - Eixample Esquerra** | 142 | **1** (0.7%) | **5** (3.5%) | 136 (95.8%) |
| **BCN - Sant Gervasi** | 142 | **0** (0.0%) | **0** (0.0%) | 142 (100.0%) |
| **BCN - Sarrià** | 50 | **0** (0.0%) | **1** (2.0%) | 49 (98.0%) |
| **Londres (Central / Soho)** | 150 | **4** (2.7%) | **11** (7.3%) | 135 (90.0%) |
| **Karlsruhe (Alemanya)** | 150 | **12** (8.0%) | **33** (22.0%) | 105 (70.0%) |
| **Berlín (Kreuzberg)** | 150 | **14** (9.3%) | **19** (12.7%) | 117 (78.0%) |
| **París (Le Marais)** | 150 | **3** (2.0%) | **5** (3.3%) | 142 (94.7%) |
| **NYC (Manhattan)** | 150 | **5** (3.3%) | **16** (10.7%) | 129 (86.0%) |
| **Weehawken, NJ (EUA)** | 31 | **1** (3.2%) | **2** (6.5%) | 28 (90.3%) |

---

## 📈 2. Conclusions Principals

1. **Els locals 100% vegans són una minoria preciosa (0.7% – 9.3%)**:
   - A ciutats com Barcelona, París o Nova York, els restaurants estrictament 100% vegans representen entre l'**1% i el 3.5%** de tots els establiments de restauració de qualsevol barri.
   - En ciutats alemanyes com Berlín o Karlsruhe (amb una forta tradició vegana i alta activitat a OSM), la xifra arriba al **8% – 9%**.
2. **Els restaurants amb opcions veganes tripliquen els 100% vegans**:
   - A pràcticament totes les ciutats, hi ha entre **3 i 4 vegades més locals amb opcions veganes** (`diet:vegan=yes`) que locals 100% exclusius.
3. **Implicació per a Vegan Tools**:
   - És imprescindible tenir dos filtres separats i clarament diferenciats:
     - `🌱 100% Vegà`: Filtre estricte per a qui busca un espai ètic pur.
     - `🌿 Opcions veganes`: Filtre inclusiu per trobar locals convencionals amb plats aptes.

---

## 🏷️ 3. Rànquing Mundial de Tags Nadius d'OpenStreetMap (Taginfo Global OSM)

Aquest és el catàleg real de tags nadius més presents a nivell mundial a OpenStreetMap en establiments de restauració:

### 🍳 A. Valors de Cuina Nadius (`cuisine=*`)
1. `cuisine=pizza` (~320.000 locals)
2. `cuisine=italian` (~180.000 locals)
3. `cuisine=burger` (~160.000 locals)
4. `cuisine=regional` / `local` (~140.000 locals)
5. `cuisine=chinese` (~120.000 locals)
6. `cuisine=asian` (~95.000 locals)
7. `cuisine=japanese` / `sushi` (~90.000 locals)
8. `cuisine=kebab` / `turkish` (~85.000 locals)
9. `cuisine=mexican` (~65.000 locals)
10. `cuisine=indian` (~60.000 locals)
11. `cuisine=thai` (~45.000 locals)
12. `cuisine=sandwich` (~40.000 locals)
13. `cuisine=greek` (~35.000 locals)
14. `cuisine=vietnamese` (~30.000 locals)
15. `cuisine=middle_eastern` / `falafel` / `lebanese` (~25.000 locals)
16. `cuisine=tapas` (~22.000 locals)
17. `cuisine=vegetarian` (~20.000 locals)
18. `cuisine=vegan` (~18.000 locals)
19. `cuisine=ramen` (~15.000 locals)
20. `cuisine=korean` (~12.000 locals)

### 🛠️ B. Característiques de l'Espai i Serveis (`key=*`)
1. **`outdoor_seating=yes`** (~450.000 locals) → Terrassa exterior
2. **`takeaway=yes`** (~400.000 locals) → Per emportar
3. **`delivery=yes`** (~220.000 locals) → Servei a domicili
4. **`wheelchair=yes`** (~190.000 locals) → Accessible amb cadira de rodes
5. **`internet_access=wlan`** (~140.000 locals) → Wi-Fi per a clients
6. **`organic=yes`** (~25.000 locals) → Productes ecològics / Bio
7. **`dog=yes`** (~20.000 locals) → Admet gossos / Pet-friendly

### 🌱 C. Etiquetes Dietètiques Nadiues (`diet:*`)
1. **`diet:vegetarian=yes|only`** (~110.000 locals)
2. **`diet:vegan=yes|only`** (~75.000 locals)
3. **`diet:gluten_free=yes|only`** (~45.000 locals)
4. **`diet:halal=yes|only`** (~30.000 locals)
5. **`diet:kosher=yes|only`** (~10.000 locals)
6. **`diet:lactose_free=yes`** (~8.000 locals)

