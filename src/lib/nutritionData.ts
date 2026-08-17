/**
 * Bundled nutrition database.
 *
 * Values are approximate, per 100 g, sourced from public USDA-style reference
 * data: [kcal, protein g, fat g, carbs g, fiber g, sugar g, sodium mg].
 *
 * - `density` (g/ml) converts volume measures to grams for foods often
 *   measured by volume (flour, oil, broth…).
 * - `unitWeight` (g) converts count measures ("2 eggs", "1 onion", "3 cloves").
 *
 * This local table covers the overwhelming majority of home-cooking
 * ingredients. Anything it misses can be resolved by the optional USDA
 * FoodData Central lookup (see nutrition.ts).
 */

export type Macros = [number, number, number, number, number, number, number];

export interface FoodEntry {
  names: string[]; // first name is canonical; all are match aliases
  per100g: Macros;
  density?: number; // g per ml
  unitWeight?: number; // g per single item
}

export const FOOD_DB: FoodEntry[] = [
  // ---- baking & pantry ----
  { names: ["all-purpose flour", "flour", "plain flour", "ap flour"], per100g: [364, 10.3, 1.0, 76.3, 2.7, 0.3, 2], density: 0.53 },
  { names: ["whole wheat flour", "wholemeal flour"], per100g: [340, 13.2, 2.5, 72.0, 10.7, 0.4, 2], density: 0.51 },
  { names: ["bread flour"], per100g: [361, 12.0, 1.7, 72.5, 2.4, 0.3, 2], density: 0.55 },
  { names: ["granulated sugar", "sugar", "white sugar", "caster sugar"], per100g: [387, 0, 0, 100, 0, 99.8, 1], density: 0.85 },
  { names: ["brown sugar", "light brown sugar", "dark brown sugar"], per100g: [380, 0.1, 0, 98.1, 0, 97.0, 28], density: 0.93 },
  { names: ["powdered sugar", "icing sugar", "confectioners sugar"], per100g: [389, 0, 0, 99.8, 0, 97.8, 2], density: 0.51 },
  { names: ["honey"], per100g: [304, 0.3, 0, 82.4, 0.2, 82.1, 4], density: 1.42 },
  { names: ["maple syrup"], per100g: [260, 0, 0.1, 67.0, 0, 60.4, 12], density: 1.32 },
  { names: ["molasses"], per100g: [290, 0, 0.1, 74.7, 0, 74.7, 37], density: 1.4 },
  { names: ["baking soda", "bicarbonate of soda"], per100g: [0, 0, 0, 0, 0, 0, 27360], density: 0.92 },
  { names: ["baking powder"], per100g: [53, 0, 0, 27.7, 0.2, 0, 10600], density: 0.9 },
  { names: ["cornstarch", "corn starch", "cornflour"], per100g: [381, 0.3, 0.1, 91.3, 0.9, 0, 9], density: 0.54 },
  { names: ["cocoa powder", "cocoa"], per100g: [228, 19.6, 13.7, 57.9, 37.0, 1.8, 21], density: 0.41 },
  { names: ["dark chocolate", "chocolate"], per100g: [546, 4.9, 31.3, 61.2, 7.0, 47.9, 24] },
  { names: ["chocolate chips"], per100g: [480, 4.2, 30.0, 63.0, 5.0, 54.0, 11], density: 0.72 },
  { names: ["vanilla extract", "vanilla"], per100g: [288, 0.1, 0.1, 12.7, 0, 12.7, 9], density: 0.88 },
  { names: ["yeast", "active dry yeast", "instant yeast"], per100g: [325, 40.4, 7.6, 41.2, 26.9, 0, 51], density: 0.65 },
  { names: ["rolled oats", "oats", "old-fashioned oats", "quick oats"], per100g: [389, 16.9, 6.9, 66.3, 10.6, 0, 2], density: 0.4 },
  { names: ["salt", "sea salt", "kosher salt", "fine salt", "table salt"], per100g: [0, 0, 0, 0, 0, 0, 38758], density: 1.22 },
  { names: ["black pepper", "pepper", "ground pepper"], per100g: [251, 10.4, 3.3, 63.9, 25.3, 0.6, 20], density: 0.47 },
  { names: ["breadcrumbs", "panko"], per100g: [395, 13.4, 5.3, 71.9, 4.5, 6.2, 732], density: 0.45 },

  // ---- oils & fats ----
  { names: ["olive oil", "extra virgin olive oil"], per100g: [884, 0, 100, 0, 0, 0, 2], density: 0.92 },
  { names: ["vegetable oil", "canola oil", "neutral oil", "sunflower oil", "grapeseed oil"], per100g: [884, 0, 100, 0, 0, 0, 0], density: 0.92 },
  { names: ["coconut oil"], per100g: [862, 0, 100, 0, 0, 0, 0], density: 0.92 },
  { names: ["sesame oil", "toasted sesame oil"], per100g: [884, 0, 100, 0, 0, 0, 0], density: 0.92 },
  { names: ["butter", "unsalted butter", "salted butter"], per100g: [717, 0.9, 81.1, 0.1, 0, 0.1, 11], density: 0.91 },
  { names: ["margarine"], per100g: [717, 0.2, 80.7, 0.9, 0, 0, 715], density: 0.91 },

  // ---- dairy & eggs ----
  { names: ["milk", "whole milk", "2% milk", "skim milk"], per100g: [61, 3.2, 3.3, 4.8, 0, 5.1, 43], density: 1.03 },
  { names: ["heavy cream", "whipping cream", "double cream"], per100g: [340, 2.8, 36.1, 2.8, 0, 2.9, 27], density: 1.0 },
  { names: ["half and half"], per100g: [131, 3.1, 11.5, 4.3, 0, 4.8, 41], density: 1.02 },
  { names: ["sour cream"], per100g: [198, 2.4, 19.4, 4.6, 0, 3.4, 31], density: 1.0 },
  { names: ["yogurt", "plain yogurt"], per100g: [61, 3.5, 3.3, 4.7, 0, 4.7, 46], density: 1.03 },
  { names: ["greek yogurt"], per100g: [59, 10.2, 0.4, 3.6, 0, 3.2, 36], density: 1.03 },
  { names: ["cream cheese"], per100g: [342, 5.9, 34.2, 4.1, 0, 3.2, 321], density: 1.0 },
  { names: ["cheddar cheese", "cheddar"], per100g: [403, 24.9, 33.1, 1.3, 0, 0.5, 621], density: 0.47 },
  { names: ["mozzarella", "mozzarella cheese"], per100g: [280, 27.5, 17.1, 3.1, 0, 1.2, 627], density: 0.47 },
  { names: ["parmesan", "parmesan cheese", "parmigiano"], per100g: [431, 38.5, 28.6, 4.1, 0, 0.9, 1529], density: 0.42 },
  { names: ["feta", "feta cheese"], per100g: [264, 14.2, 21.3, 4.1, 0, 4.1, 917], density: 0.62 },
  { names: ["eggs", "egg", "large eggs", "large egg"], per100g: [143, 12.6, 9.5, 0.7, 0, 0.4, 142], unitWeight: 50 },
  { names: ["egg yolk", "egg yolks"], per100g: [322, 15.9, 26.5, 3.6, 0, 0.6, 48], unitWeight: 17 },
  { names: ["egg white", "egg whites"], per100g: [52, 10.9, 0.2, 0.7, 0, 0.7, 166], unitWeight: 33 },
  { names: ["coconut milk", "canned coconut milk"], per100g: [230, 2.3, 23.8, 5.5, 2.2, 3.3, 15], density: 0.97 },

  // ---- proteins ----
  { names: ["chicken breast", "chicken breasts", "boneless skinless chicken breast"], per100g: [165, 31.0, 3.6, 0, 0, 0, 74], unitWeight: 175 },
  { names: ["chicken thigh", "chicken thighs"], per100g: [177, 18.6, 10.9, 0, 0, 0, 95], unitWeight: 120 },
  { names: ["ground beef", "beef mince", "minced beef"], per100g: [250, 26.0, 17.0, 0, 0, 0, 75] },
  { names: ["steak", "beef steak", "sirloin"], per100g: [271, 25.0, 18.0, 0, 0, 0, 58] },
  { names: ["pork chop", "pork chops", "pork loin"], per100g: [231, 23.7, 14.6, 0, 0, 0, 62], unitWeight: 180 },
  { names: ["bacon"], per100g: [541, 37.0, 42.0, 1.4, 0, 1.0, 1717], unitWeight: 12 },
  { names: ["ham"], per100g: [145, 20.9, 5.5, 1.5, 0, 0, 1200] },
  { names: ["ground turkey", "turkey mince"], per100g: [148, 19.7, 7.7, 0, 0, 0, 69] },
  { names: ["salmon", "salmon fillet"], per100g: [208, 20.4, 13.4, 0, 0, 0, 59], unitWeight: 170 },
  { names: ["tuna", "canned tuna"], per100g: [116, 25.5, 0.8, 0, 0, 0, 50] },
  { names: ["shrimp", "prawns"], per100g: [99, 24.0, 0.3, 0.2, 0, 0, 111] },
  { names: ["cod", "white fish"], per100g: [82, 17.8, 0.7, 0, 0, 0, 54], unitWeight: 150 },
  { names: ["tofu", "firm tofu", "extra-firm tofu"], per100g: [110, 12.0, 6.0, 2.5, 1.0, 0.7, 10] },
  { names: ["tempeh"], per100g: [192, 20.3, 10.8, 7.6, 4.8, 0, 9] },
  { names: ["lentils", "red lentils", "green lentils", "brown lentils"], per100g: [352, 24.6, 1.1, 63.4, 10.7, 2.0, 6], density: 0.85 },
  { names: ["chickpeas", "garbanzo beans"], per100g: [139, 7.0, 2.6, 22.5, 6.4, 0.3, 246], density: 0.68 },
  { names: ["black beans"], per100g: [91, 6.0, 0.3, 16.6, 6.9, 0.3, 140], density: 0.74 },
  { names: ["kidney beans"], per100g: [84, 8.7, 0.3, 15.2, 6.4, 0.3, 2], density: 0.74 },

  // ---- grains, pasta, bread ----
  { names: ["rice", "white rice", "jasmine rice", "basmati rice"], per100g: [365, 7.1, 0.7, 80.0, 1.3, 0.1, 5], density: 0.85 },
  { names: ["cooked rice"], per100g: [130, 2.7, 0.3, 28.2, 0.4, 0.1, 1], density: 0.81 },
  { names: ["brown rice"], per100g: [370, 7.9, 2.9, 77.2, 3.5, 0.9, 7], density: 0.85 },
  { names: ["pasta", "spaghetti", "penne", "macaroni", "fusilli", "linguine"], per100g: [371, 13.0, 1.5, 74.7, 3.2, 2.7, 6] },
  { names: ["quinoa"], per100g: [368, 14.1, 6.1, 64.2, 7.0, 6.1, 5], density: 0.85 },
  { names: ["bread", "sandwich bread"], per100g: [265, 9.0, 3.2, 49.0, 2.7, 5.0, 491], unitWeight: 30 },
  { names: ["tortilla", "tortillas", "flour tortilla"], per100g: [312, 8.2, 7.7, 51.4, 3.5, 3.8, 736], unitWeight: 45 },
  { names: ["couscous"], per100g: [376, 12.8, 0.6, 77.4, 5.0, 2.1, 10], density: 0.72 },

  // ---- vegetables ----
  { names: ["onion", "yellow onion", "white onion", "red onion", "onions"], per100g: [40, 1.1, 0.1, 9.3, 1.7, 4.2, 4], unitWeight: 150, density: 0.55 },
  { names: ["garlic", "garlic cloves", "garlic clove", "cloves garlic"], per100g: [149, 6.4, 0.5, 33.1, 2.1, 1.0, 17], unitWeight: 3, density: 0.57 },
  { names: ["tomato", "tomatoes", "roma tomato", "cherry tomatoes"], per100g: [18, 0.9, 0.2, 3.9, 1.2, 2.6, 5], unitWeight: 123, density: 0.61 },
  { names: ["crushed tomatoes", "canned tomatoes", "diced tomatoes", "tomato sauce", "passata"], per100g: [32, 1.6, 0.3, 7.3, 1.9, 4.4, 186], density: 1.03 },
  { names: ["tomato paste"], per100g: [82, 4.3, 0.5, 18.9, 4.1, 12.2, 59], density: 1.1 },
  { names: ["carrot", "carrots"], per100g: [41, 0.9, 0.2, 9.6, 2.8, 4.7, 69], unitWeight: 61, density: 0.54 },
  { names: ["celery", "celery stalk", "celery stalks"], per100g: [16, 0.7, 0.2, 3.0, 1.6, 1.3, 80], unitWeight: 40 },
  { names: ["bell pepper", "red bell pepper", "green bell pepper", "capsicum"], per100g: [26, 1.0, 0.3, 6.0, 2.1, 4.2, 4], unitWeight: 120 },
  { names: ["broccoli", "broccoli florets"], per100g: [34, 2.8, 0.4, 6.6, 2.6, 1.7, 33], density: 0.38, unitWeight: 300 },
  { names: ["cauliflower"], per100g: [25, 1.9, 0.3, 5.0, 2.0, 1.9, 30], density: 0.4, unitWeight: 575 },
  { names: ["spinach", "baby spinach"], per100g: [23, 2.9, 0.4, 3.6, 2.2, 0.4, 79], density: 0.13 },
  { names: ["kale"], per100g: [49, 4.3, 0.9, 8.8, 3.6, 2.3, 38], density: 0.28 },
  { names: ["zucchini", "courgette"], per100g: [17, 1.2, 0.3, 3.1, 1.0, 2.5, 8], unitWeight: 196 },
  { names: ["cucumber"], per100g: [15, 0.7, 0.1, 3.6, 0.5, 1.7, 2], unitWeight: 300 },
  { names: ["potato", "potatoes", "russet potato", "yukon gold"], per100g: [77, 2.0, 0.1, 17.5, 2.2, 0.8, 6], unitWeight: 213 },
  { names: ["sweet potato", "sweet potatoes"], per100g: [86, 1.6, 0.1, 20.1, 3.0, 4.2, 55], unitWeight: 130 },
  { names: ["mushrooms", "mushroom", "cremini mushrooms", "button mushrooms"], per100g: [22, 3.1, 0.3, 3.3, 1.0, 2.0, 5], density: 0.35 },
  { names: ["corn", "frozen corn", "corn kernels", "sweet corn"], per100g: [88, 3.3, 1.2, 19.0, 2.0, 3.2, 1], density: 0.7 },
  { names: ["peas", "frozen peas", "green peas"], per100g: [77, 5.2, 0.4, 13.6, 4.4, 4.7, 3], density: 0.63 },
  { names: ["green beans"], per100g: [31, 1.8, 0.2, 7.0, 2.7, 3.3, 6], density: 0.44 },
  { names: ["cabbage"], per100g: [25, 1.3, 0.1, 5.8, 2.5, 3.2, 18], unitWeight: 900 },
  { names: ["lettuce", "romaine"], per100g: [15, 1.4, 0.2, 2.9, 1.3, 0.8, 28], density: 0.2 },
  { names: ["avocado", "avocados"], per100g: [160, 2.0, 14.7, 8.5, 6.7, 0.7, 7], unitWeight: 200 },
  { names: ["ginger", "fresh ginger"], per100g: [80, 1.8, 0.8, 17.8, 2.0, 1.7, 13], density: 0.42 },
  { names: ["scallion", "scallions", "green onion", "green onions", "spring onion"], per100g: [32, 1.8, 0.2, 7.3, 2.6, 2.3, 16], unitWeight: 15 },
  { names: ["cilantro", "coriander leaves"], per100g: [23, 2.1, 0.5, 3.7, 2.8, 0.9, 46], density: 0.07 },
  { names: ["parsley"], per100g: [36, 3.0, 0.8, 6.3, 3.3, 0.9, 56], density: 0.15 },
  { names: ["basil", "fresh basil"], per100g: [23, 3.2, 0.6, 2.7, 1.6, 0.3, 4], density: 0.1 },

  // ---- fruit ----
  { names: ["lemon", "lemons"], per100g: [29, 1.1, 0.3, 9.3, 2.8, 2.5, 2], unitWeight: 58 },
  { names: ["lemon juice"], per100g: [22, 0.4, 0.2, 6.9, 0.3, 2.5, 1], density: 1.02 },
  { names: ["lime", "limes"], per100g: [30, 0.7, 0.2, 10.5, 2.8, 1.7, 2], unitWeight: 44 },
  { names: ["lime juice"], per100g: [25, 0.4, 0.1, 8.4, 0.4, 1.7, 2], density: 1.02 },
  { names: ["apple", "apples"], per100g: [52, 0.3, 0.2, 13.8, 2.4, 10.4, 1], unitWeight: 182 },
  { names: ["banana", "bananas"], per100g: [89, 1.1, 0.3, 22.8, 2.6, 12.2, 1], unitWeight: 118 },
  { names: ["orange", "oranges"], per100g: [47, 0.9, 0.1, 11.8, 2.4, 9.4, 0], unitWeight: 131 },
  { names: ["blueberries", "berries"], per100g: [57, 0.7, 0.3, 14.5, 2.4, 10.0, 1], density: 0.63 },
  { names: ["strawberries"], per100g: [32, 0.7, 0.3, 7.7, 2.0, 4.9, 1], density: 0.65 },
  { names: ["raisins"], per100g: [299, 3.1, 0.5, 79.2, 3.7, 59.2, 11], density: 0.7 },

  // ---- condiments, sauces, liquids ----
  { names: ["soy sauce", "tamari"], per100g: [53, 8.1, 0.6, 4.9, 0.8, 0.4, 5493], density: 1.16 },
  { names: ["fish sauce"], per100g: [35, 5.1, 0, 3.6, 0, 3.6, 7851], density: 1.2 },
  { names: ["rice vinegar", "white vinegar", "vinegar"], per100g: [18, 0, 0, 0.9, 0, 0.5, 2], density: 1.01 },
  { names: ["balsamic vinegar"], per100g: [88, 0.5, 0, 17.0, 0, 15.0, 23], density: 1.06 },
  { names: ["apple cider vinegar"], per100g: [21, 0, 0, 0.9, 0, 0.4, 5], density: 1.01 },
  { names: ["ketchup"], per100g: [101, 1.0, 0.1, 25.8, 0.3, 21.3, 907], density: 1.14 },
  { names: ["mustard", "dijon mustard"], per100g: [66, 4.4, 3.3, 5.8, 3.3, 0.9, 1135], density: 1.05 },
  { names: ["mayonnaise", "mayo"], per100g: [680, 1.0, 75.0, 0.6, 0, 0.6, 635], density: 0.91 },
  { names: ["worcestershire sauce"], per100g: [78, 0, 0, 19.5, 0, 10.0, 980], density: 1.15 },
  { names: ["hot sauce"], per100g: [11, 1.3, 0.4, 1.8, 0.3, 1.9, 2643], density: 1.05 },
  { names: ["sriracha"], per100g: [93, 2.0, 1.0, 19.0, 2.0, 15.0, 2124], density: 1.1 },
  { names: ["peanut butter"], per100g: [588, 25.0, 50.0, 20.0, 6.0, 9.0, 17], density: 1.09 },
  { names: ["tahini"], per100g: [595, 17.0, 53.8, 21.2, 9.3, 0.5, 115], density: 1.03 },
  { names: ["vegetable broth", "vegetable stock", "veggie broth"], per100g: [5, 0.2, 0.1, 1.0, 0, 0.5, 300], density: 1.0 },
  { names: ["chicken broth", "chicken stock"], per100g: [7, 0.9, 0.2, 0.4, 0, 0.2, 343], density: 1.0 },
  { names: ["water", "water or vegetable stock"], per100g: [0, 0, 0, 0, 0, 0, 0], density: 1.0 },
  { names: ["white wine", "red wine", "cooking wine", "wine"], per100g: [83, 0.1, 0, 2.6, 0, 0.8, 5], density: 0.99 },

  // ---- spices & seasonings ----
  { names: ["curry powder"], per100g: [325, 14.3, 14.0, 55.8, 53.2, 2.8, 52], density: 0.42 },
  { names: ["paprika", "smoked paprika"], per100g: [282, 14.1, 12.9, 54.0, 34.9, 10.3, 68], density: 0.46 },
  { names: ["cumin", "ground cumin"], per100g: [375, 17.8, 22.3, 44.2, 10.5, 2.3, 168], density: 0.41 },
  { names: ["cinnamon", "ground cinnamon"], per100g: [247, 4.0, 1.2, 80.6, 53.1, 2.2, 10], density: 0.53 },
  { names: ["chili powder"], per100g: [282, 13.5, 14.3, 49.7, 34.8, 7.2, 1640], density: 0.45 },
  { names: ["oregano", "dried oregano"], per100g: [265, 9.0, 4.3, 68.9, 42.5, 4.1, 25], density: 0.2 },
  { names: ["thyme", "dried thyme"], per100g: [276, 9.1, 7.4, 63.9, 37.0, 1.7, 55], density: 0.2 },
  { names: ["red pepper flakes", "chili flakes"], per100g: [318, 12.0, 17.3, 56.6, 27.2, 10.3, 30], density: 0.36 },
  { names: ["turmeric"], per100g: [312, 9.7, 3.3, 67.1, 22.7, 3.2, 27], density: 0.53 },
  { names: ["garlic powder"], per100g: [331, 16.6, 0.7, 72.7, 9.0, 2.4, 60], density: 0.53 },
  { names: ["onion powder"], per100g: [341, 10.4, 1.0, 79.1, 15.2, 6.6, 73], density: 0.48 },
  { names: ["nutritional yeast"], per100g: [325, 45.0, 5.0, 35.0, 20.0, 5.0, 100], density: 0.25 },

  // ---- nuts & seeds ----
  { names: ["almonds", "sliced almonds"], per100g: [579, 21.2, 49.9, 21.6, 12.5, 4.4, 1], density: 0.6 },
  { names: ["walnuts"], per100g: [654, 15.2, 65.2, 13.7, 6.7, 2.6, 2], density: 0.5 },
  { names: ["cashews"], per100g: [553, 18.2, 43.9, 30.2, 3.3, 5.9, 12], density: 0.6 },
  { names: ["pecans"], per100g: [691, 9.2, 72.0, 13.9, 9.6, 4.0, 0], density: 0.5 },
  { names: ["peanuts"], per100g: [567, 25.8, 49.2, 16.1, 8.5, 4.7, 18], density: 0.62 },
  { names: ["sesame seeds"], per100g: [573, 17.7, 49.7, 23.4, 11.8, 0.3, 11], density: 0.6 },
  { names: ["chia seeds"], per100g: [486, 16.5, 30.7, 42.1, 34.4, 0, 16], density: 0.68 },
];
