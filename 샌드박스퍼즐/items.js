class CraftingItem {
    constructor(id, name, color, size = 40) {
        this.id = id;
        this.name = name;
        this.color = color;
        this.size = size;
    }
}

const ITEMS = {
    wood: new CraftingItem("wood", "통나무", "#6b4226", 45),
    stone: new CraftingItem("stone", "돌", "#888c8d", 40),
    stick: new CraftingItem("stick", "막대기", "#d2b48c", 25),
    flint: new CraftingItem("flint", "부싯돌", "#2f4f4f", 30),
    iron_ore: new CraftingItem("iron_ore", "철광석", "#b0c4de", 35),
    iron: new CraftingItem("iron", "철", "#e6e6fa", 35),
    gold_ore: new CraftingItem("gold_ore", "금광석", "#daa520", 35),
    gold_bar: new CraftingItem("gold_bar", "금괴", "#ffd700", 35),
    axe: new CraftingItem("axe", "도끼", "#778899", 50),
    pickaxe: new CraftingItem("pickaxe", "곡괭이", "#708090", 50)
};

// 기본 자판기 드롭 아이템 ID 목록
const BASIC_DROPS = ["wood", "stone", "iron_ore", "gold_ore"];

const RECIPES = [
    { input1: "wood", input2: "wood", output: "stick" }, // 나무 2개로 막대기 깎기
    { input1: "stone", input2: "stone", output: "flint" }, // 돌 2개로 부싯돌 만들기
    { input1: "iron_ore", input2: "flint", output: "iron" }, // 철광석을 부싯돌 불꽃으로 제련
    { input1: "gold_ore", input2: "flint", output: "gold_bar" }, // 금광석 제련
    { input1: "stick", input2: "flint", output: "axe" }, // 도끼
    { input1: "stick", input2: "iron", output: "pickaxe" } // 곡괭이
];

function getRecipeOutput(id1, id2) {
    const recipe = RECIPES.find(r =>
        (r.input1 === id1 && r.input2 === id2) ||
        (r.input1 === id2 && r.input2 === id1)
    );
    return recipe ? ITEMS[recipe.output] : null;
}
