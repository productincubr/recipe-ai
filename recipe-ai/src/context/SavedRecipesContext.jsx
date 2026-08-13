import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { getSavedRecipes, saveRecipe, removeSavedRecipe } from '../services/userFeaturesApi';

const SavedRecipesContext = createContext(null);

/**
 * App-wide "which recipes are saved" state, so the bookmark button on every
 * card and the sidebar count stay in sync the moment the user saves/unsaves
 * a recipe anywhere in the app.
 */
export function SavedRecipesProvider({ children }) {
  const [savedIds, setSavedIds] = useState(new Set());

  useEffect(() => {
    getSavedRecipes().then((res) => {
      if (res.success && Array.isArray(res.data)) {
        setSavedIds(new Set(res.data.map((r) => r.id)));
      }
    });
  }, []);

  const toggleSave = useCallback(
    async (id) => {
      const wasSaved = savedIds.has(id);
      setSavedIds((prev) => {
        const next = new Set(prev);
        if (wasSaved) next.delete(id);
        else next.add(id);
        return next;
      });
      try {
        await (wasSaved ? removeSavedRecipe(id) : saveRecipe(id));
      } catch {
        // Revert on failure — request didn't actually go through.
        setSavedIds((prev) => {
          const next = new Set(prev);
          if (wasSaved) next.add(id);
          else next.delete(id);
          return next;
        });
      }
    },
    [savedIds],
  );

  return (
    <SavedRecipesContext.Provider value={{ savedIds, toggleSave }}>
      {children}
    </SavedRecipesContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components -- hook is tightly coupled to this provider
export function useSavedRecipes() {
  const ctx = useContext(SavedRecipesContext);
  if (!ctx) {
    throw new Error('useSavedRecipes must be used within a SavedRecipesProvider');
  }
  return ctx;
}
