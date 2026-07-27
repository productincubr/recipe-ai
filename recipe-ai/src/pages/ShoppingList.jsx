import { useEffect, useState } from 'react';
import { getShoppingList, addShoppingListItem, toggleShoppingListItem, removeShoppingListItem } from '../services/userFeaturesApi';
import { Plus, Trash2, CheckCircle2, Circle } from 'lucide-react';

export default function ShoppingList() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newItemName, setNewItemName] = useState('');
  const [newItemQty, setNewItemQty] = useState('');

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = () => {
    setLoading(true);
    getShoppingList().then(res => {
      if (res.success) {
        setItems(res.data);
      }
      setLoading(false);
    });
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newItemName.trim()) return;
    await addShoppingListItem(newItemName, newItemQty);
    setNewItemName('');
    setNewItemQty('');
    fetchItems();
  };

  const handleToggle = async (id, currentStatus) => {
    // Optimistic update
    setItems(items.map(item => item.id === id ? { ...item, is_checked: !currentStatus } : item));
    await toggleShoppingListItem(id, !currentStatus);
  };

  const handleRemove = async (id) => {
    setItems(items.filter(item => item.id !== id));
    await removeShoppingListItem(id);
  };

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-olive-dark">Shopping List</h1>
      
      <form onSubmit={handleAdd} className="flex gap-4 mb-8">
        <input 
          type="text" 
          placeholder="Ingredient name (e.g. Tomatoes)"
          value={newItemName}
          onChange={e => setNewItemName(e.target.value)}
          className="flex-1 p-3 border border-cream-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-olive-soft"
        />
        <input 
          type="text" 
          placeholder="Qty (e.g. 2 lbs)"
          value={newItemQty}
          onChange={e => setNewItemQty(e.target.value)}
          className="w-32 p-3 border border-cream-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-olive-soft"
        />
        <button type="submit" className="bg-olive hover:bg-olive-dark text-white p-3 rounded-xl transition-colors">
          <Plus />
        </button>
      </form>

      {loading ? (
        <p>Loading list...</p>
      ) : items.length === 0 ? (
        <p className="text-ink-soft text-center py-8">Your shopping list is empty.</p>
      ) : (
        <ul className="space-y-3">
          {items.map(item => (
            <li key={item.id} className={`flex items-center justify-between p-4 rounded-xl border transition-colors ${item.is_checked ? 'bg-cream-100 border-cream-200' : 'bg-white border-cream-200 shadow-sm'}`}>
              <div className="flex items-center gap-4 cursor-pointer flex-1" onClick={() => handleToggle(item.id, item.is_checked)}>
                {item.is_checked ? (
                  <CheckCircle2 className="text-olive" />
                ) : (
                  <Circle className="text-cream-400" />
                )}
                <span className={`text-lg ${item.is_checked ? 'line-through text-ink-muted' : 'text-ink-dark'}`}>
                  {item.ingredient_name}
                </span>
                {item.quantity && (
                  <span className={`text-sm ml-auto mr-4 ${item.is_checked ? 'text-ink-muted' : 'text-ink-soft'}`}>
                    {item.quantity}
                  </span>
                )}
              </div>
              <button onClick={() => handleRemove(item.id)} className="text-red-400 hover:text-red-600 p-2">
                <Trash2 size={18} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
