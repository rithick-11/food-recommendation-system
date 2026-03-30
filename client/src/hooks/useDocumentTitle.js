import { useEffect } from 'react';

const useDocumentTitle = (title) => {
  useEffect(() => {
    document.title = title ? `${title} | Meal Plan` : 'Meal Plan AI';
  }, [title]);
};

export default useDocumentTitle;
