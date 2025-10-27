import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useState } from 'react';

const Navbar = () => {
  const { isAuthenticated, user, logout } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    setIsMobileMenuOpen(false);
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  return (
    <nav className="bg-white shadow-lg sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center py-4">
          {/* Logo */}
          <Link 
            to="/" 
            className="text-xl font-bold text-blue-600 hover:text-blue-700 transition-colors"
            onClick={closeMobileMenu}
          >
            🍽️ FoodRec
          </Link>
          
          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-6">
            <Link
              to="/"
              className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium transition-colors"
            >
              Home
            </Link>
            
            {isAuthenticated() ? (
              <>
                <Link
                  to="/dashboard"
                  className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  Dashboard
                </Link>
                
                {user?.role === 'patient' && (
                  <>
                    <Link
                      to="/profile"
                      className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                    >
                      My Profile
                    </Link>
                    <Link
                      to="/meal-plan"
                      className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                    >
                      My Meal Plan
                    </Link>
                  </>
                )}
                
                {user?.role === 'doctor' && (
                  <Link
                    to="/dashboard"
                    className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                  >
                    Patients
                  </Link>
                )}
                
                {user?.role === 'admin' && (
                  <Link
                    to="/admin/dashboard"
                    className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                  >
                    Admin Panel
                  </Link>
                )}
                
                <div className="flex items-center space-x-3 border-l border-gray-200 pl-4">
                  <div className="flex flex-col text-right">
                    <span className="text-sm font-medium text-gray-900">
                      {user?.name}
                    </span>
                    <span className="text-xs text-gray-500 capitalize">
                      {user?.role}
                    </span>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                  >
                    Logout
                  </button>
                </div>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  Register
                </Link>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={toggleMobileMenu}
              className="text-gray-700 hover:text-blue-600 focus:outline-none focus:text-blue-600 transition-colors"
              aria-label="Toggle mobile menu"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {isMobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-gray-200 py-4">
            <div className="flex flex-col space-y-2">
              <Link
                to="/"
                className="text-gray-700 hover:text-blue-600 hover:bg-gray-50 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                onClick={closeMobileMenu}
              >
                Home
              </Link>
              
              {isAuthenticated() ? (
                <>
                  <Link
                    to="/dashboard"
                    className="text-gray-700 hover:text-blue-600 hover:bg-gray-50 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                    onClick={closeMobileMenu}
                  >
                    Dashboard
                  </Link>
                  
                  {user?.role === 'patient' && (
                    <>
                      <Link
                        to="/profile"
                        className="text-gray-700 hover:text-blue-600 hover:bg-gray-50 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                        onClick={closeMobileMenu}
                      >
                        My Profile
                      </Link>
                      <Link
                        to="/meal-plan"
                        className="text-gray-700 hover:text-blue-600 hover:bg-gray-50 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                        onClick={closeMobileMenu}
                      >
                        My Meal Plan
                      </Link>
                    </>
                  )}
                  
                  {user?.role === 'doctor' && (
                    <Link
                      to="/dashboard"
                      className="text-gray-700 hover:text-blue-600 hover:bg-gray-50 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                      onClick={closeMobileMenu}
                    >
                      Patients
                    </Link>
                  )}
                  
                  {user?.role === 'admin' && (
                    <Link
                      to="/admin/dashboard"
                      className="text-gray-700 hover:text-blue-600 hover:bg-gray-50 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                      onClick={closeMobileMenu}
                    >
                      Admin Panel
                    </Link>
                  )}
                  
                  <div className="border-t border-gray-200 pt-4 mt-4">
                    <div className="px-3 py-2">
                      <div className="text-sm font-medium text-gray-900">
                        {user?.name}
                      </div>
                      <div className="text-xs text-gray-500 capitalize">
                        {user?.role}
                      </div>
                    </div>
                    <button
                      onClick={handleLogout}
                      className="w-full text-left bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-md text-sm font-medium transition-colors mt-2"
                    >
                      Logout
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <Link
                    to="/login"
                    className="text-gray-700 hover:text-blue-600 hover:bg-gray-50 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                    onClick={closeMobileMenu}
                  >
                    Login
                  </Link>
                  <Link
                    to="/register"
                    className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-md text-sm font-medium transition-colors"
                    onClick={closeMobileMenu}
                  >
                    Register
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;