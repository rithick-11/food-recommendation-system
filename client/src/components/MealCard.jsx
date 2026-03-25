const MealCard = ({ mealType, mealData, dayNumber = null }) => {
  const mealIcons = {
    breakfast: '🌅',
    lunch: '☀️',
    snacks: '🍎',
    dinner: '🌙'
  };

  if (!mealData) {
    return (
      <div className="bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow p-6">
        <div className="flex items-center mb-4">
          <span className="text-2xl mr-3">{mealIcons[mealType] || '🍽️'}</span>
          <div>
            <h3 className="text-xl font-semibold text-gray-900 capitalize">
              {mealType}
            </h3>
            {dayNumber && (
              <span className="text-sm text-gray-500">Day {dayNumber}</span>
            )}
          </div>
        </div>
        <div className="text-center py-8">
          <div className="text-gray-400 text-4xl mb-2">📭</div>
          <p className="text-gray-500">No meal data available</p>
        </div>
      </div>
    );
  }

  const {
    items,
    delivery_search_query,
    carbs_g,
    protein_g,
    fat_g,
    fiber_g,
    calories_kcal
  } = mealData;

  // Helper to parse items into individual search queries
  const parseItemsForSearch = (itemsString) => {
    return itemsString
      .split(/,|\band\b/i) // Split by comma or 'and'
      .map(item => {
        // Remove quantities and units (e.g., "1 cup", "2 slices", "1/2 bowl")
        let cleaned = item.replace(/^[0-9\/\s]+(cup[s]?|bowl[s]?|glass[es]?|pieces?|slices?|tbsp|tsp)\s*/i, '');
        // Remove simple leading numbers ("2 rotis" -> "rotis")
        cleaned = cleaned.replace(/^[0-9\s]+/, '');
        return cleaned.trim();
      })
      .filter(item => item.length > 2); // Keep only meaningful strings
  };

  const parsedItems = parseItemsForSearch(items);

  return (
    <div className="bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow p-6">
      <div className="flex items-center mb-4">
        <span className="text-2xl mr-3">{mealIcons[mealType] || '🍽️'}</span>
        <div>
          <h3 className="text-xl font-semibold text-gray-900 capitalize">
            {mealType}
          </h3>
          {dayNumber && (
            <span className="text-sm text-gray-500">Day {dayNumber}</span>
          )}
        </div>
      </div>
      
      <div className="mb-6">
        <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
          <span className="mr-2">🍽️</span>
          Food Items:
        </h4>
        <p className="text-gray-600 leading-relaxed bg-gray-50 p-3 rounded-lg mb-4">
          {items}
        </p>

        <h4 className="text-sm font-semibold text-gray-700 mb-2 mt-4 flex items-center">
          <span className="mr-2">🛒</span>
          Order Individual Items:
        </h4>
        <div className="flex flex-col gap-2">
          {parsedItems.map((item, index) => (
            <div key={index} className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-white border border-gray-100 p-3 rounded-lg shadow-sm hover:shadow-md transition-shadow">
              <span className="text-sm font-medium text-gray-800 mb-2 sm:mb-0 capitalize flex-1 pr-2 truncate" title={item}>
                {item}
              </span>
              <div className="flex gap-2 w-full sm:w-auto">
                <a
                  href={`https://www.swiggy.com/search?query=${encodeURIComponent(item)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 sm:flex-none px-3 py-1.5 bg-[#FC8019] text-white text-xs font-medium rounded-md hover:bg-[#e07014] transition-colors text-center shadow-sm"
                >
                  Swiggy
                </a>
                <a
                  href={`https://www.zomato.com/search?keyword=${encodeURIComponent(item)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 sm:flex-none px-3 py-1.5 bg-[#E23744] text-white text-xs font-medium rounded-md hover:bg-[#c9303c] transition-colors text-center shadow-sm"
                >
                  Zomato
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-gray-100 pt-4">
        <h4 className="text-sm font-semibold text-gray-700 mb-4 flex items-center">
          <span className="mr-2">📊</span>
          Nutritional Information:
        </h4>
        
        {/* Calories highlight */}
        <div className="bg-blue-50 rounded-lg p-3 mb-4">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-blue-700">Total Calories:</span>
            <span className="text-lg font-bold text-blue-900">{calories_kcal} kcal</span>
          </div>
        </div>

        {/* Macronutrients grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-green-50 rounded-lg p-3 text-center">
            <div className="text-xs text-green-600 font-medium mb-1">Protein</div>
            <div className="text-lg font-bold text-green-800">{protein_g}g</div>
          </div>
          <div className="bg-yellow-50 rounded-lg p-3 text-center">
            <div className="text-xs text-yellow-600 font-medium mb-1">Carbs</div>
            <div className="text-lg font-bold text-yellow-800">{carbs_g}g</div>
          </div>
          <div className="bg-red-50 rounded-lg p-3 text-center">
            <div className="text-xs text-red-600 font-medium mb-1">Fat</div>
            <div className="text-lg font-bold text-red-800">{fat_g}g</div>
          </div>
          <div className="bg-purple-50 rounded-lg p-3 text-center">
            <div className="text-xs text-purple-600 font-medium mb-1">Fiber</div>
            <div className="text-lg font-bold text-purple-800">{fiber_g}g</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MealCard;