export type DietCategory = 'vegan' | 'vegetarian' | 'carnivore';

export interface MenuItem {
  name: string;
  description?: string;
  price?: string;
  category: DietCategory;
  modificationNote?: string;
  modifiableTo?: DietCategory;
}

export interface MenuSection {
  sectionName: string;
  items: MenuItem[];
}

export interface MenuData {
  restaurantName?: string;
  sections: MenuSection[];
}
