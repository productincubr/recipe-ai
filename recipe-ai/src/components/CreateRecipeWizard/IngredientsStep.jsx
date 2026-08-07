import { useState } from "react";
import { X } from "lucide-react";

export default function IngredientsStep({ ingredients, setIngredients }) {
  const [text, setText] = useState("");

  const addIngredient = () => {
    const value = text.trim();
    if (!value) return;
    if (!ingredients.some((i) => i.toLowerCase() === value.toLowerCase())) {
      setIngredients([...ingredients, value]);
    }
    setText("");
  };

  const removeIngredient = (value) => {
    setIngredients(ingredients.filter((i) => i !== value));
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addIngredient();
    }
  };

  return (
    <div className="mt-8">
      <div className="flex h-[60px] items-center gap-3 rounded-full border border-cream-300 bg-cream-100 px-6 shadow-sm focus-within:border-olive focus-within:ring-2 focus-within:ring-olive-soft">
        <input
          autoFocus
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="e.g. Paneer, Spinach, Brown rice..."
          className="flex-1 bg-transparent outline-none ring-0 text-ink"
        />
        <button
          type="button"
          onClick={addIngredient}
          disabled={!text.trim()}
          className="rounded-full bg-olive-dark px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Add
        </button>
      </div>

      {ingredients.length > 0 && (
        <div className="mt-5 flex flex-wrap gap-2">
          {ingredients.map((ing) => (
            <span
              key={ing}
              className="flex items-center gap-2 rounded-full bg-olive-soft px-4 py-2 text-sm font-medium text-olive-deep"
            >
              {ing}
              <button
                type="button"
                onClick={() => removeIngredient(ing)}
                aria-label={`Remove ${ing}`}
                className="text-olive-deep/70 hover:text-olive-deep"
              >
                <X size={14} />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
