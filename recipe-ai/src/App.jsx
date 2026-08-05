import { BrowserRouter, Routes, Route } from 'react-router-dom'
import AppLayout from './layout/AppLayout'
import Home from './pages/Home'
import Placeholder from './pages/Placeholder'
import History from './pages/History'
import SavedRecipes from './pages/SavedRecipes'
import MealPlanner from './pages/MealPlanner'
import ShoppingList from './pages/ShoppingList'
import Nutrition from './pages/Nutrition'
import RecipeDetails from './pages/RecipeDetails'
import CreateRecipe from './pages/CreateRecipe'
import ScanMeal from './pages/ScanMeal'

/**
 * Root of the RecipeAI front-end.
 * All routes render inside the fixed-sidebar AppLayout shell.
 */
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Standalone full-screen wizard — no sidebar/navbar chrome */}
        <Route path="/create" element={<CreateRecipe />} />
        <Route element={<AppLayout />}>
          <Route index element={<Home />} />
          <Route path="/scan" element={<ScanMeal />} />
          <Route path="/recipe/:id" element={<RecipeDetails />} />
          <Route path="/history" element={<History />} />
          <Route path="/saved" element={<SavedRecipes />} />
          <Route path="/meal-planner" element={<MealPlanner />} />
          <Route path="/shopping-list" element={<ShoppingList />} />
          <Route path="/nutrition" element={<Nutrition />} />
          <Route
            path="/how-it-works"
            element={<Placeholder title="How It Works" />}
          />
          <Route path="/pricing" element={<Placeholder title="Pricing" />} />
          <Route path="*" element={<Placeholder title="Page not found" />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
