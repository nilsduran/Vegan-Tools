"""
Script per generar el Golden Benchmark Set (Fase 0) per a Vegan Tools.
Aquest conjunt de test és immutable, 100% curat i auditat per avaluar
qualsevol model present o futur amb casos extrems, falsos amics, traces i productes reals.
"""

import json
from pathlib import Path
from typing import List, Dict

BENCHMARK_DIR = Path("data/dataset/benchmark")
BENCHMARK_DIR.mkdir(parents=True, exist_ok=True)
OUTPUT_FILE = BENCHMARK_DIR / "golden_test_set.jsonl"

def create_golden_benchmark() -> List[Dict]:
    samples = []

    # --------------------------------------------------------------------------
    # 1. HARD NEGATIVES VEGETALS (100% VEGANS: han de ser [0, 0, 0])
    # Paraules que enganyen models ingenus (contenen "mantega", "llet", "carn", "formatge", etc.)
    # --------------------------------------------------------------------------
    hard_vegans = [
        # Català
        ("Xocolata negra: pasta de cacau, sucre, mantega de cacau, aroma natural de vainilla", "ca", "hard_vegan_cocoa_butter"),
        ("Beguda vegetal: aigua, civada (14%), oli de gira-sol, sal marina", "ca", "hard_vegan_oat_milk"),
        ("Beguda de llet d'ametlles: aigua, ametlles (4%), sucre de canya, carbonat de calci", "ca", "hard_vegan_almond_milk"),
        ("Crema untable: cacauets torrats (99%), sal", "ca", "hard_vegan_peanut_butter"),
        ("Hamburguesa vegetal: aigua, proteïna de soja texturitzada, oli d'oliva, ceba, sal, pebre", "ca", "hard_vegan_soy_burger"),
        ("Carn vegetal a base de pèsol: aigua, concentrat de proteïna de pèsol, oli de colza, espècies", "ca", "hard_vegan_plant_meat"),
        ("Formatge vegà en rodanxes: aigua, oli de coco (23%), midó modificat, sal marina, aroma vegana", "ca", "hard_vegan_vegan_cheese"),
        ("Postre gelificant: aigua, sucre, suc de llimona, gelificant: agar-agar, aroma natural", "ca", "hard_vegan_agar_agar"),
        ("Pa de motlle: farina de blat, aigua, llevat, oli d'oliva, sal, àcid làctic d'origen vegetal", "ca", "hard_vegan_plant_lactic_acid"),
        ("Beguda de llet de coco per a cuinar: extracte de coco (60%), aigua, goma guar", "ca", "hard_vegan_coconut_milk"),
        ("Salsitxes veganes: tofu (soja, aigua, clorur de magnesi), oli de gira-sol, pebre vermell dolç", "ca", "hard_vegan_vegan_sausage"),
        ("Iogurt 100% vegetal de soja: beguda de soja fermentada, ferments de iogurt seleccionats, sucre", "ca", "hard_vegan_soy_yogurt"),

        # Castellà
        ("Chocolate negro: pasta de cacao, azúcar, manteca de cacao, emulgente: lecitina de girasol", "es", "hard_vegan_cocoa_butter_es"),
        ("Bebida de avena: agua, avena ecológica, aceite de girasol virgen, sal", "es", "hard_vegan_oat_drink_es"),
        ("Crema de cacahuete: 100% cacahuetes tostados con piel", "es", "hard_vegan_peanut_cream_es"),
        ("Hamburguesa 100% vegetal: agua, proteína de soja, aceite de coco, cebolla caramelizada, sal", "es", "hard_vegan_soy_meat_es"),
        ("Queso vegano rallado: agua, aceite de coco, almidón de patata, levadura nutricional, aroma", "es", "hard_vegan_vegan_cheese_es"),
        ("Mantequilla de cacahuete cremosa: cacahuetes tostados, sal marina", "es", "hard_vegan_peanut_butter_es"),
        ("Bebida de leche de almendras sin azúcar: agua, almendras, estabilizante: goma gellan", "es", "hard_vegan_almond_drink_es"),
        ("Carne de soja texturizada fina: 100% harina de soja desgrasada", "es", "hard_vegan_textured_soy_es"),

        # Anglès
        ("Dark chocolate bar: cocoa mass, sugar, cocoa butter, vanilla extract", "en", "hard_vegan_cocoa_butter_en"),
        ("Plant milk: filtered water, organic whole oats, organic sunflower oil, sea salt", "en", "hard_vegan_oat_milk_en"),
        ("Peanut butter: 100% roasted peanuts, sea salt", "en", "hard_vegan_peanut_butter_en"),
        ("Vegan cheese slices: water, coconut oil, modified potato starch, sea salt, vegan flavour", "en", "hard_vegan_vegan_cheese_en"),
        ("Meatless plant-based burger: water, soy protein isolate, coconut oil, expeller-pressed canola oil", "en", "hard_vegan_plant_burger_en"),
        ("Almond milk unsweetened: almondmilk (filtered water, almonds), calcium carbonate, sea salt", "en", "hard_vegan_almond_milk_en"),
        ("Vegan cream cheese alternative: almond milk, coconut cream, salt, bacterial cultures", "en", "hard_vegan_vegan_cream_cheese_en"),
        ("Vegetable jelly cup: water, sugar, gelling agent: pectin, citric acid, natural raspberry flavour", "en", "hard_vegan_pectin_jelly_en"),

        # Alemany
        ("Zartbitterschokolade: Kakaomasse, Zucker, Kakaobutter, Bourbon-Vanille-Extrakt", "de", "hard_vegan_cocoa_butter_de"),
        ("Bio-Hafermilch: Wasser, Vollkornhafer (12%), Sonnenblumenöl, Meersalz", "de", "hard_vegan_oat_milk_de"),
        ("Erdnussbutter cremig: 100% geröstete Erdnüsse", "de", "hard_vegan_peanut_butter_de"),
        ("Vegane Burger-Patties: Wasser, Sojaproteinkonzentrat, Kokosöl, Zwiebeln, Gewürze", "de", "hard_vegan_vegan_burger_de"),
        ("Veganer Käse-Genuss Scheiben: Wasser, Kokosöl (24%), modifizierte Stärke, Meersalz", "de", "hard_vegan_vegan_cheese_de"),
        ("Mandeldrink ungesüßt: Wasser, Mandeln (2.5%), Calciumcarbonat, Meersalz", "de", "hard_vegan_almond_milk_de"),

        # Francès
        ("Chocolat noir de dégustation: pâte de cacao, sucre, beurre de cacao, émulsifiant: lécithine de soja", "fr", "hard_vegan_cocoa_butter_fr"),
        ("Boisson végétale à l'avoine: eau, avoine bio (14%), huile de tournesol, sel marin", "fr", "hard_vegan_oat_milk_fr"),
        ("Beurre de cacahuète crémeux: 100% cacahuètes grillées", "fr", "hard_vegan_peanut_butter_fr"),
        ("Steak végétal: eau, protéines de soja réhydratées, oignons, huile de colza, sel", "fr", "hard_vegan_soy_steak_fr"),
        ("Fromage végétal en tranches: eau, huile de coco, fécule de pomme de terre, arôme naturel", "fr", "hard_vegan_vegan_cheese_fr"),

        # Italià
        ("Cioccolato fondente extra: pasta di cacao, zucchero, burro di cacao, aroma naturale vaniglia", "it", "hard_vegan_cocoa_butter_it"),
        ("Bevanda a base di soia: acqua, semi di soia decorticati (8%), sale marino", "it", "hard_vegan_soy_drink_it"),
        ("Burro di arachidi puro: 100% arachidi tostate", "it", "hard_vegan_peanut_butter_it"),
        ("Formaggio vegano spalmabile: bevanda di soia, olio di cocco, sale, fermenti lattici vegetali", "it", "hard_vegan_vegan_cheese_it"),
    ]

    for text, lang, entity_id in hard_vegans:
        samples.append({
            "text": text,
            "language": lang,
            "category": "hard_vegan",
            "entity_id": entity_id,
            "has_slaughter": 0,
            "has_secretion": 0,
            "has_dual_origin": 0,
        })

    # --------------------------------------------------------------------------
    # 2. CARNS I ESCORXADOR CLARS I DORMITS (SLAUGHTER: [1, 0, 0])
    # Carmí E120, gelatina animal, caldo de pollo, ossos, cansalada, extractes carnis
    # --------------------------------------------------------------------------
    slaughter_cases = [
        # Català
        ("Gominoles de maduixa: xarop de glucosa, sucre, aigua, gelatina de porc, acidulant: àcid cítric", "ca", "slaughter_gelatin_ca"),
        ("Iogurt de maduixa artesà: llet sencera, sucre, maduixa, colorant: carmí de cotxinilla (E120)", "ca", "slaughter_carmine_ca"), # [1, 1, 0] carn+lacti
        ("Sopa de fideus: sèmola de blat dur, brou de pollastre (aigua, carn de pollastre, api, sal), oli", "ca", "slaughter_chicken_broth_ca"),
        ("Embotit tradicional: carn de porc, sal marina, pebre negre, conservador: nitrit sòdic", "ca", "slaughter_pork_ca"),
        ("Formatge artesà curat: llet crua d'ovella, sal, quall animal d'estómac de xai", "ca", "slaughter_animal_rennet_ca"), # [1, 1, 0]
        ("Patates xips gust pernil: patates, oli de gira-sol, aroma de pernil (conté derivats de carn de porc)", "ca", "slaughter_ham_flavor_ca"),
        ("Tonyina en conserva: tonyina clara (Thunnus albacares), oli d'oliva verge, sal", "ca", "slaughter_tuna_ca"),
        ("Brou de peix concentrat: aigua, rap, lluç, cranc, gambes, tomàquet, ceba, oli d'oliva, sal", "ca", "slaughter_fish_stock_ca"),
        ("Gelatina sabor taronja: aigua, sucre, gelatina alimentària (origen boví), aromes, colorant", "ca", "slaughter_bovine_gelatin_ca"),

        # Castellà
        ("Golosinas surtidas: jarabe de glucosa, azúcar, gelatina, acidulante: ácido láctico, colorantes", "es", "slaughter_gelatin_es"),
        ("Chorizo ibérico: carne de cerdo ibérico, pimentón de la Vera, sal, ajo, tripa natural de cerdo", "es", "slaughter_chorizo_es"),
        ("Yogur de fresa cremosa: leche pasteurizada, azúcar, fresas, colorante: carmines (E120)", "es", "slaughter_carmine_es"), # [1, 1, 0]
        ("Caldo de pollo casero: agua, pollo campero (15%), puerro, zanahoria, apio, sal marina", "es", "slaughter_chicken_stock_es"),
        ("Sobrasada mallorquina: magro y tocino de cerdo, pimentón dulce, sal, especias", "es", "slaughter_sobrasada_es"),
        ("Filetes de anchoa del Cantábrico: anchoas (Engraulis encrasicolus), aceite de oliva, sal", "es", "slaughter_anchovy_es"),
        ("Paté de hígado de pato: hígado graso de pato, agua, grasa de pato, sal, pimienta negra", "es", "slaughter_duck_pate_es"),

        # Anglès
        ("Gummy bears: glucose syrup, sugar, gelatin, dextrose, citric acid, fruit concentrate", "en", "slaughter_gummy_gelatin_en"),
        ("Strawberry jelly pots: water, sugar, pork gelatine, citric acid, colours: carmine, anthocyanins", "en", "slaughter_carmine_gelatin_en"),
        ("Chicken noodle soup: chicken broth, cooked chicken meat, enriched egg noodles, salt, celery", "en", "slaughter_chicken_soup_en"), # [1, 1, 0] carn + ou
        ("Traditional beef stock: water, beef bones, beef meat, onions, carrots, thyme, bay leaf", "en", "slaughter_beef_bones_en"),
        ("Worcestershire sauce: malt vinegar, molasses, sugar, water, anchovies, tamarind extract, spices", "en", "slaughter_worcestershire_anchovy_en"),
        ("Smoked bacon rashers: pork belly, salt, sugar, preservatives (sodium nitrite, potassium nitrate)", "en", "slaughter_bacon_en"),
        ("Marshmallows: corn syrup, sugar, dextrose, modified cornstarch, water, gelatin, artificial flavor", "en", "slaughter_marshmallow_gelatin_en"),
        ("Caesar dressing: soybean oil, water, parmesan cheese, egg yolk, anchovy paste (anchovies, salt)", "en", "slaughter_caesar_anchovy_en"), # [1, 1, 0]

        # Alemany
        ("Gummibärchen: Glukosesirup, Zucker, Gelatine, Dextrose, Fruchtsaft aus Fruchtsaftkonzentrat", "de", "slaughter_gelatine_de"),
        ("Rinderbrühe klar: Wasser, Rindfleischextrakt, Meersalz, Rinderfett, Zwiebeln, Karotten", "de", "slaughter_beef_extract_de"),
        ("Schweinewurst: Schweinefleisch (85%), Trinkwasser, Speck, Speisesalz, Gewürze, Dextrose", "de", "slaughter_pork_sausage_de"),
        ("Hühnersuppe mit Nudeln: Trinkwasser, Hühnerfleisch, Nudeln (Hartweizengrieß), Sellerie, Salz", "de", "slaughter_chicken_soup_de"),
        ("Schinkenwurst geräuchert: Schweinefleisch, Nitritpökelsalz (Speisesalz, Konservierungsstoff: E250)", "de", "slaughter_cured_ham_de"),

        # Francès
        ("Bonbons gélifiés: sirop de glucose, sucre, gélatine de porc, acidifiant: acide citrique, arômes", "fr", "slaughter_gelatine_fr"),
        ("Bouillon de boeuf: eau, viande de boeuf (12%), sel marin, graisse de boeuf, carottes, poireaux", "fr", "slaughter_beef_broth_fr"),
        ("Saucisson sec traditionnel: viande de porc, sel, sucres (lactose, dextrose), épices, conservateur: E252", "fr", "slaughter_saucisson_fr"), # [1, 1, 0]
        ("Rillettes du Mans: viande de porc, gras de porc, sel, poivre", "fr", "slaughter_rillettes_fr"),
        ("Terrine de saumon: saumon (Salmo salar 40%), crème fraîche, oeufs entiers, sel, poivre", "fr", "slaughter_salmon_terrine_fr"), # [1, 1, 0]

        # Italià
        ("Gelatina di frutta: sciroppo di glucosio, zucchero, gelatina alimentare, succo di mela, aromi", "it", "slaughter_gelatina_it"),
        ("Brodo di carne concentrato: acqua, carne bovina (15%), sale, estratto di lievito, cipolla", "it", "slaughter_beef_broth_it"),
        ("Prosciutto crudo stagionato: coscia di suino, sale marino", "it", "slaughter_prosciutto_it"),
        ("Tonno all'olio di oliva: tonno a pinne gialle, olio di oliva, sale", "it", "slaughter_tuna_it"),
    ]

    for item in slaughter_cases:
        text, lang, entity_id = item
        # Calculem etiquetes exactes segons contingut real
        is_slaughter = 1
        is_secretion = 1 if any(w in text.lower() for w in ["llet", "leche", "milk", "crème", "crema", "lactose", "oeufs", "egg", "huevo", "parmesan", "ou "]) else 0
        samples.append({
            "text": text,
            "language": lang,
            "category": "slaughter",
            "entity_id": entity_id,
            "has_slaughter": is_slaughter,
            "has_secretion": is_secretion,
            "has_dual_origin": 0,
        })

    # --------------------------------------------------------------------------
    # 3. SECRECIONS ANIMALS (VEGETARIÀ SÍ, VEGÀ NO: [0, 1, 0])
    # Llet, formatge, iogurt, mantega, sèrum de llet, clara d'ou, mel, cera d'abelles
    # --------------------------------------------------------------------------
    secretion_cases = [
        # Català
        ("Galetes de xocolata amb llet: farina de blat, sucre, mantega (llet), xocolata amb llet (sucre, mantega de cacau, llet en pols), ous frescos", "ca", "secretion_milk_egg_cookies_ca"),
        ("Iogurt natural: llet sencera de vaca pasteuritzada, proteïnes de la llet, ferments làctics", "ca", "secretion_plain_yogurt_ca"),
        ("Formatge gouda en talls: llet de vaca pasteuritzada, sal, ferments làctics, quall microbià", "ca", "secretion_gouda_cheese_ca"),
        ("Magdalenes casolanes: farina de blat, sucre, ou pasteuritzat (20%), oli de gira-sol, gasificant", "ca", "secretion_muffin_egg_ca"),
        ("Te verd amb mel: aigua, extracte de te verd, mel de flors silvestres (3%), suc de llimona", "ca", "secretion_honey_tea_ca"),
        ("Xiclets de menta: edulcorants (xilitol, sorbitol), goma base, aromes, agent de recobriment: cera d'abelles (E901)", "ca", "secretion_beeswax_gum_ca"),
        ("Puré de patates suau: patates deshidratades, sèrum de llet en pols, llet desnatada en pols, sal, mantega", "ca", "secretion_mashed_potatoes_ca"),
        ("Pa de brioix: farina de blat, mantega de vaca (15%), ou fresc, sucre, llevat, sal", "ca", "secretion_brioche_butter_ca"),

        # Castellà
        ("Galletas Digestive: harina de trigo, azúcar, grasa vegetal (palma), suero de leche en polvo, sal", "es", "secretion_whey_digestive_es"),
        ("Queso manchego semicurado: leche pasteurizada de oveja, sal, fermentos lácteos, cuajo vegetal", "es", "secretion_manchego_es"),
        ("Bizcocho de limón: harina de trigo, azúcar, huevo líquido pasteurizado, aceite de girasol, ralladura", "es", "secretion_sponge_cake_es"),
        ("Caramelos de miel y limón: azúcar, jarabe de glucosa, miel de abeja (8%), aroma natural de limón", "es", "secretion_honey_candy_es"),
        ("Mantequilla tradicional: crema de leche pasteurizada (nata), fermentos lácticos", "es", "secretion_butter_es"),
        ("Mayonesa casera: aceite de soja, agua, yema de huevo pasteurizada (6%), vinagre de vino, sal", "es", "secretion_mayo_egg_es"),

        # Anglès
        ("Milk chocolate bar: sugar, cocoa butter, whole milk powder, cocoa mass, emulsifier (soy lecithin)", "en", "secretion_milk_chocolate_en"),
        ("Cheddar cheese: pasteurised cow's milk, salt, vegetarian rennet, dairy starter cultures", "en", "secretion_cheddar_en"),
        ("Shortbread biscuits: wheat flour, butter (milk) (32%), sugar, salt", "en", "secretion_shortbread_butter_en"),
        ("Whey protein powder: whey protein concentrate (milk), natural vanilla flavour, sweetener (stevia)", "en", "secretion_whey_powder_en"),
        ("Pancake mix: enriched bleached flour, sugar, dried whole egg, leavening, nonfat dry milk, salt", "en", "secretion_pancake_mix_en"),
        ("Organic honey granola: rolled oats, wild flower honey (15%), sunflower seeds, cold pressed rapeseed oil", "en", "secretion_honey_granola_en"),
        ("Lip balm sweet orange: almond oil, beeswax (cera alba), shea butter, orange peel oil", "en", "secretion_beeswax_balm_en"),

        # Alemany
        ("Vollmilchschokolade: Zucker, Kakaobutter, Vollmilchpulver (18%), Kakaomasse, Milchzucker, Emulgator: Sojalecithine", "de", "secretion_milk_chocolate_de"),
        ("Butterkeks: Weizenmehl, Zucker, Butter (12%), Invertzuckersirup, Backtriebmittel, Molkenerzeugnis, Salz", "de", "secretion_butter_cookie_de"),
        ("Emmentaler Hartkäse: pasteurisierte Kuhmilch, Speisesalz, Käsereikulturen, mikrobielles Lab", "de", "secretion_emmental_de"),
        ("Bienenhonig flüssig: 100% reiner Blütenhonig aus der EU", "de", "secretion_pure_honey_de"),
        ("Eierwaffeln: Weizenmehl, Frischei (28%), Zucker, pflanzliches Fett (Raps), Feuchthaltemittel (Glycerin)", "de", "secretion_egg_waffle_de"),

        # Francès
        ("Chocolat au lait fondant: sucre, beurre de cacao, poudre de lait entier, pâte de cacao, lactose", "fr", "secretion_milk_choc_fr"),
        ("Croissant pur beurre: farine de blé, beurre frais (24%), eau, sucre, levure, oeufs, sel", "fr", "secretion_croissant_butter_fr"),
        ("Fromage Camembert de Normandie: lait cru de vache, sel, ferments lactiques, présure", "fr", "secretion_camembert_fr"),
        ("Gaufres aux oeufs frais: farine de blé, oeufs entiers frais (30%), sucre, huile de colza, sel", "fr", "secretion_egg_waffle_fr"),
        ("Madeleines pur beurre: farine de blé, beurre pâtissier (22%), oeufs frais, sucre, sirop de glucose", "fr", "secretion_madeleine_fr"),

        # Italià
        ("Biscotti frollini alla panna: farina di frumento, zucchero, burro, panna fresca pastorizzata (7%), uova fresche", "it", "secretion_frollini_cream_it"),
        ("Mozzarella di bufala campana DOP: latte di bufala, siero innesto naturale, sale, caglio", "it", "secretion_mozzarella_it"),
        ("Panettone tradizionale: farina di grano tenero, uvetta, burro, tuorlo d'uovo fresco, zucchero", "it", "secretion_panettone_it"),
    ]

    for text, lang, entity_id in secretion_cases:
        samples.append({
            "text": text,
            "language": lang,
            "category": "secretion",
            "entity_id": entity_id,
            "has_slaughter": 0,
            "has_secretion": 1,
            "has_dual_origin": 0,
        })

    # --------------------------------------------------------------------------
    # 4. TRACES PRECAUTÒRIES EN PRODUCTES 100% VEGANS
    # Han de continuar sent [0, 0, 0] perquè les traces són al·lèrgies creuades a fàbrica!
    # --------------------------------------------------------------------------
    trace_vegans = [
        # Català
        ("Galetes d'avena i xocolata negra: flocs d'avena (45%), farina d'espelta, oli de gira-sol alt oleic, sucre de canya, cacau pur. Pot contenir traces de llet, ou i fruits secs.", "ca", "trace_vegan_oat_cookies_ca"),
        ("Barqueta de tofu marinat: tofu (aigua, soia ecològica, coagulant: nigari), salsa de tamari, gingebre fresc, all. Elaborat en una instal·lació que manipula lactis i peix.", "ca", "trace_vegan_tofu_marinated_ca"),
        ("Pa de pagès artesà: farina de blat mòlta a la pedra, aigua, massa mare natural, sal marina. Traces de sèsam, llet i ou per contacte creuat a l'obrador.", "ca", "trace_vegan_bread_traces_ca"),
        ("Crema de verdures de temporada: carbassa, pastanaga, porro, patata, oli d'oliva verge extra, sal. Pot contenir traces de crustacis i mol·luscs.", "ca", "trace_vegan_soup_crustacean_ca"),
        ("Muesli cruixent: flocs de civada, llavors de gira-sol, poma deshidratada, canyella. Fabricat en una línia que també processa productes làctics.", "ca", "trace_vegan_muesli_ca"),

        # Castellà
        ("Copos de maíz tostados: maíz (94%), azúcar, sal marina, extracto de malta de cebada. Puede contener trazas de leche y productos a base de leche.", "es", "trace_vegan_cornflakes_es"),
        ("Hummus clásico: garbanzos cocidos (60%), tahini (semillas de sésamo), agua, aceite de oliva, zumo de limón, sal, ajo en polvo. Fabricado en planta que utiliza huevo y pescado.", "es", "trace_vegan_hummus_es"),
        ("Pasta integral de trigo espelta: 100% sémola integral de trigo espelta ecológica. Posibles trazas de huevo.", "es", "trace_vegan_spelt_pasta_es"),
        ("Barrita energética de frutos secos: dátiles (50%), almendras (30%), cacao en polvo (20%). Puede contener trazas de lácteos y huevo.", "es", "trace_vegan_energy_bar_es"),

        # Anglès
        ("Crispy corn tortilla chips: whole grain corn, sunflower oil, sea salt. May contain traces of milk and egg due to shared manufacturing equipment.", "en", "trace_vegan_tortilla_chips_en"),
        ("Organic dark chocolate 72%: cocoa beans, raw cane sugar, cocoa butter. Made in a factory that handles dairy and tree nuts.", "en", "trace_vegan_dark_choc_trace_en"),
        ("Granola clusters: whole grain rolled oats, maple syrup, coconut oil, dried blueberries. Manufactured on equipment that processes egg and milk.", "en", "trace_vegan_granola_trace_en"),
        ("Plant protein shake powder: pea protein isolate, brown rice protein, natural vanilla flavour, stevia. Packed in a facility that also packs whey protein.", "en", "trace_vegan_protein_shake_trace_en"),

        # Alemany
        ("Bio-Dinkelwaffeln: Vollkorn-Dinkelmehl (99%), Meersalz. Kann Spuren von Milch, Eiern und Soja enthalten.", "de", "trace_vegan_spelt_waffles_de"),
        ("Tomatensauce mit Basilikum: Tomatenfruchtfleisch (82%), Zwiebeln, Olivenöl extra vergine, Basilikum, Meersalz. Hergestellt in einem Betrieb, der Milch verarbeitet.", "de", "trace_vegan_tomato_sauce_de"),
        ("Knäckebrot Roggen: Roggenvollkornmehl, Hefe, Salz. Kann produktionsbedingt Spuren von Milchbestandteilen enthalten.", "de", "trace_vegan_crispbread_de"),

        # Francès
        ("Galettes de riz complet: riz complet biologique (99.5%), sel de Guérande. Traces éventuelles de lait, graines de sésame et soja.", "fr", "trace_vegan_rice_cakes_fr"),
        ("Compote de pommes bio: purée de pommes (99.9%), antioxydant: acide ascorbique. Fabriqué dans un atelier utilisant du lait et des oeufs.", "fr", "trace_vegan_applesauce_fr"),
    ]

    for text, lang, entity_id in trace_vegans:
        samples.append({
            "text": text,
            "language": lang,
            "category": "trace_vegan",
            "entity_id": entity_id,
            "has_slaughter": 0,
            "has_secretion": 0,
            "has_dual_origin": 0,
        })

    # --------------------------------------------------------------------------
    # 5. ADDITIUS DE DOBLE ORIGEN / DUBTOSOS (DUAL ORIGIN: [0, 0, 1])
    # E471 (mono i diglicèrids), àcid esteàric E570, glicerol E422, vitamina D3
    # --------------------------------------------------------------------------
    dual_cases = [
        # Català
        ("Pa de motlle blanc tradicional: farina de blat, aigua, llevat, oli de gira-sol, sal, emulgents: E471, E481, conservador: propionat de calci", "ca", "dual_e471_bread_ca"),
        ("Pastís industrial esponjós: farina de blat, sucre, aigua, xarop de glucosa, emulgent (mono- i diglicèrids d'àcids grassos), glicerina (E422), aroma", "ca", "dual_glycerin_e471_ca"),
        ("Cereals enriquits per a esmorzar: blat de moro, sucre, sal, extracte de malta, vitamines (niacina, vitamina B6, vitamina D3 - colecalciferol)", "ca", "dual_vitamin_d3_ca"),
        ("Margarina 3/4 vegetal: aigua, greixos vegetals (palma, colza), emulgent: E472e, sal, aroma natural", "ca", "dual_e472e_ca"),
        ("Xiclet sense sucre: edulcorants (sorbitol, maltitol), goma base, humectant: glicerol (E422), àcid esteàric (E570)", "ca", "dual_stearic_acid_ca"),

        # Castellà
        ("Pan de molde sin corteza: harina de trigo, agua, levadura, azúcar, aceite de girasol, sal, emulgentes (E-471, E-472e), conservadores", "es", "dual_e471_bread_es"),
        ("Galletas saladas crackers: harina de trigo, grasa de palma, jarabe de glucosa, gasificantes, emulgente: monoglicéridos y diglicéridos de ácidos grasos", "es", "dual_monoglycerides_es"),
        ("Golosina ácida vegana sin gelatina: azúcar, jarabe de glucosa, almidón modificado, acidulante: ácido cítrico, humectante: E422, aromas", "es", "dual_e422_candy_es"),
        ("Cereals infantiles vitaminados: trigo integral, azúcar, cacao en polvo, carbonato de calcio, vitamina D (colecalciferol)", "es", "dual_vit_d3_es"),

        # Anglès
        ("White sandwich bread: enriched wheat flour, water, yeast, soybean oil, salt, mono- and diglycerides (E471), calcium propionate", "en", "dual_e471_sandwich_bread_en"),
        ("Breakfast cereal fortified: whole grain wheat, sugar, salt, barley malt extract, vitamin D3, iron, niacin", "en", "dual_d3_cereal_en"),
        ("Chewing gum peppermint: sorbitol, gum base, glycerol (E422), natural mint flavors, magnesium stearate (E572)", "en", "dual_stearate_gum_en"),
        ("Puff pastry ready rolled: wheat flour, margarine (vegetable oils, emulsifiers: E471, E475), water, salt", "en", "dual_e475_pastry_en"),
        ("Margarine spread: purified water, palm oil, salt, mono- and diglycerides of fatty acids, beta-carotene", "en", "dual_margarine_en"),

        # Alemany
        ("Toastbrot klassisch: Weizenmehl, Wasser, Hefe, Rapsöl, Zucker, Salz, Emulgator: Mono- und Diglyceride von Speisefettsäuren (E471)", "de", "dual_toastbrot_e471_de"),
        ("Frühstücksflocken Flakes: Mais, Zucker, Salz, Gerstenmalz, Vitamine (Niacin, Vitamin D3, Vitamin B12)", "de", "dual_cereal_d3_de"),
        ("Kaugummi Spearmint: Kaumasse, Süßungsmittel (Isomalt, Maltitsirup), Feuchthaltemittel: Glycerin (E422), Überzugsmittel: Carnaubawachs", "de", "dual_glycerin_gum_de"),

        # Francès
        ("Pain de mie complet: farine complète de blé, eau, huile de colza, sucre, levure, sel, émulsifiant: E471, conservateur: propionate de calcium", "fr", "dual_pain_mie_e471_fr"),
        ("Céréales chocolatées enrichies: blé complet (53%), sucre, chocolat en poudre, sel, vitamine D3, arôme naturel", "fr", "dual_cereals_d3_fr"),

        # Italià
        ("Pane per tramezzini: farina di grano tenero tipo 0, acqua, olio di semi di girasole, sale, emulsionante: mono e digliceridi degli acidi grassi", "it", "dual_tramezzini_it"),
    ]

    for text, lang, entity_id in dual_cases:
        samples.append({
            "text": text,
            "language": lang,
            "category": "dual_origin",
            "entity_id": entity_id,
            "has_slaughter": 0,
            "has_secretion": 0,
            "has_dual_origin": 1,
        })

    # --------------------------------------------------------------------------
    # 6. PRODUCTES CORRENTS VEGANS SENSE COMPLICACIÓ (CLEAN VEGAN: [0, 0, 0])
    # Pasta, arròs, llegums en conserva, tomàquet triturat, cafè, sucs, espècies
    # --------------------------------------------------------------------------
    clean_vegans = [
        # Català
        ("Espaguetis clàssics: 100% sèmola de blat dur de qualitat superior", "ca", "clean_pasta_ca"),
        ("Llenties cuites en conserva: llenties seleccionades, aigua de cocció, sal marina, antioxidant: àcid ascòrbic", "ca", "clean_lentils_ca"),
        ("Tomàquet triturat natural: tomàquet fresc (99%), sal, acidulant: àcid cítric", "ca", "clean_tomato_ca"),
        ("Oli d'oliva verge extra: 100% oli obtingut directament d'olives arbequines mitjançant procediments mecànics", "ca", "clean_olive_oil_ca"),
        ("Arròs rodó del Delta de l'Ebre: 100% arròs blanc categoria extra", "ca", "clean_rice_ca"),
        ("Cigrons cuits ecològics: cigrons de proximitat, aigua de cocció, sal", "ca", "clean_chickpeas_ca"),
        ("Cafè mòlt natural: 100% cafè torrat d'espècie aràbica", "ca", "clean_coffee_ca"),
        ("Suc de taronja 100% exprimit: 100% suc de taronja fresca amb polpa", "ca", "clean_orange_juice_ca"),
        ("Olives farcides de pebrot: olives manzanilla desossades, pasta de pebrot (aigua, pebrot, estabilitzant: alginat sòdic), sal", "ca", "clean_olives_ca"),

        # Castellà
        ("Macarrones tradicionales: 100% sémola de trigo candeal seleccionada", "es", "clean_macaroni_es"),
        ("Alubias blancas cocidas: alubias, agua, sal, secuestrante: EDTA disódico", "es", "clean_beans_es"),
        ("Tomate frito con aceite de oliva: tomate, aceite de oliva virgen extra (5%), azúcar, sal, cebolla, ajo", "es", "clean_fried_tomato_es"),
        ("Arroz basmati aromático: 100% arroz basmati de grano largo", "es", "clean_basmati_es"),
        ("Guisantes muy tiernos: guisantes verdes, agua, azúcar, sal marina", "es", "clean_peas_es"),

        # Anglès
        ("Dry spaghetti pasta: 100% durum wheat semolina", "en", "clean_spaghetti_en"),
        ("Organic black beans: cooked black beans, water, sea salt", "en", "clean_black_beans_en"),
        ("Diced canned tomatoes: chopped tomatoes, tomato juice, citric acid", "en", "clean_canned_tomatoes_en"),
        ("Pure maple syrup: 100% pure Grade A Canadian maple syrup", "en", "clean_maple_syrup_en"),
        ("Rolled porridge oats: 100% wholegrain rolled oat flakes", "en", "clean_oats_en"),

        # Alemany
        ("Spaghetti Vollkorn: 100% Bio-Hartweizenvollkorngrieß", "de", "clean_spaghetti_de"),
        ("Kichererbsen im Glas: Kichererbsen, Wasser, Meersalz", "de", "clean_chickpeas_de"),
        ("Passierte Tomaten: Tomaten, Meersalz", "de", "clean_pureed_tomatoes_de"),
        ("Apfelsaft naturtrüb: 100% frisch gepresster Direktsaft aus Äpfeln", "de", "clean_apple_juice_de"),

        # Francès
        ("Pâtes coquillettes: semoule de blé dur de qualité supérieure", "fr", "clean_pasta_fr"),
        ("Haricots verts extra-fins: haricots verts, eau, sel marin", "fr", "clean_green_beans_fr"),
        ("Lentilles vertes du Puy AOP: 100% lentilles vertes", "fr", "clean_lentilles_fr"),

        # Italià
        ("Penne rigate: 100% semola di grano duro italiano", "it", "clean_penne_it"),
        ("Passata di pomodoro verace: pomodoro fresco (99.5%), sale", "it", "clean_passata_it"),
        ("Ceci lessati: ceci, acqua, sale", "it", "clean_ceci_it"),
    ]

    for text, lang, entity_id in clean_vegans:
        samples.append({
            "text": text,
            "language": lang,
            "category": "clean_vegan",
            "entity_id": entity_id,
            "has_slaughter": 0,
            "has_secretion": 0,
            "has_dual_origin": 0,
        })

    return samples

def main():
    samples = create_golden_benchmark()
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        for s in samples:
            f.write(json.dumps(s, ensure_ascii=False) + "\n")

    print(f"✅ Generat Golden Test Set immutable a {OUTPUT_FILE}")
    print(f"   Total mostres curades: {len(samples)}")

    # Estadístiques per categoria i idioma
    categories = {}
    languages = {}
    for s in samples:
        c = s["category"]
        categories[c] = categories.get(c, 0) + 1
        l = s["language"]
        languages[l] = languages.get(l, 0) + 1

    print("\n📊 Distribució per Categoria Ètica:")
    for c, cnt in sorted(categories.items()):
        print(f"   - {c:<22}: {cnt:>3} mostres")

    print("\n🌐 Distribució per Idioma:")
    for l, cnt in sorted(languages.items()):
        print(f"   - {l:<5}: {cnt:>3} mostres")

if __name__ == "__main__":
    main()
