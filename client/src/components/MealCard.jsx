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

  // Fallback for older meal plans that don't have this field
  const searchQuery = delivery_search_query || 
    items.split(' with ')[0].split(',')[0].replace(/^[0-9\s]+(cup[s]?|bowl[s]?|glass[es]?|pieces?|slices?)\s*/i, '').trim();

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
        <div className="flex gap-3">
          <a
            href={`https://www.swiggy.com/search?query=${encodeURIComponent(searchQuery)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 bg-[#FC8019] hover:bg-[#e07014] text-white text-sm font-medium py-2 px-4 rounded-lg flex items-center justify-center transition-colors shadow-sm"
          >
            Order on Swiggy
          </a>
          <a
            href={`https://www.zomato.com/search?keyword=${encodeURIComponent(searchQuery)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 bg-[#E23744] hover:bg-[#c9303c] text-white text-sm font-medium py-2 px-4 rounded-lg flex items-center justify-center transition-colors shadow-sm"
          >
            Order on Zomato
          </a>
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