const API_BASE = import.meta.env.VITE_API_BASE_URL 
  ? `${import.meta.env.VITE_API_BASE_URL}/api/user`
  : 'https://recipe-final-zjcl.onrender.com/api/user';


export const getHistory = async () => {
  const res = await fetch(`${API_BASE}/history`);
  return res.json();
};

export const getSavedRecipes = async () => {
  const res = await fetch(`${API_BASE}/saved`);
  return res.json();
};

export const saveRecipe = async (recipe_id) => {
  const res = await fetch(`${API_BASE}/saved`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ recipe_id })
  });
  return res.json();
};

export const removeSavedRecipe = async (recipe_id) => {
  const res = await fetch(`${API_BASE}/saved/${recipe_id}`, { method: 'DELETE' });
  return res.json();
};

export const getMealPlans = async () => {
  const res = await fetch(`${API_BASE}/meal-plans`);
  return res.json();
};

export const addMealPlan = async (plan_date, meal_type, recipe_id) => {
  const res = await fetch(`${API_BASE}/meal-plans`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ plan_date, meal_type, recipe_id })
  });
  return res.json();
};

export const deleteMealPlan = async (id) => {
  const res = await fetch(`${API_BASE}/meal-plans/${id}`, { method: 'DELETE' });
  return res.json();
};

export const getShoppingList = async () => {
  const res = await fetch(`${API_BASE}/shopping-list`);
  return res.json();
};

export const addShoppingListItem = async (ingredient_name, quantity) => {
  const res = await fetch(`${API_BASE}/shopping-list`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ingredient_name, quantity })
  });
  return res.json();
};

export const toggleShoppingListItem = async (id, is_checked) => {
  const res = await fetch(`${API_BASE}/shopping-list/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ is_checked })
  });
  return res.json();
};

export const removeShoppingListItem = async (id) => {
  const res = await fetch(`${API_BASE}/shopping-list/${id}`, { method: 'DELETE' });
  return res.json();
};
