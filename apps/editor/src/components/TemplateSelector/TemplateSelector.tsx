import { useState, useEffect } from 'react';
import { useEditorStore } from '../../stores/editorStore';
import { templatesApi, Template, Category } from '../../api';

export const TemplateSelector = ({ onClose }: { onClose: () => void }) => {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { editor, setTemplateData } = useEditorStore();

  useEffect(() => {
    loadCategoriesAndTemplates();
  }, []);

  const loadCategoriesAndTemplates = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Load categories
      const categoriesData = await templatesApi.getCategories();
      setCategories(categoriesData);

      // Load all templates
      const templatesData = await templatesApi.getTemplates();
      setTemplates(templatesData);
    } catch (err) {
      console.error('Failed to load templates:', err);
      setError('템플릿을 불러오는 데 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCategorySelect = async (categoryId: string | null) => {
    setSelectedCategoryId(categoryId);

    if (!categoryId) {
      // Show all templates
      const templatesData = await templatesApi.getTemplates();
      setTemplates(templatesData);
    } else {
      // Filter by category
      const templatesData = await templatesApi.getTemplatesByCategory(categoryId);
      setTemplates(templatesData);
    }
  };

  const handleSelectTemplate = (template: Template) => {
    setTemplateData(template.canvasData);
    editor?.loadTemplate(template.canvasData);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full mx-4 max-h-[80vh] overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold">템플릿 선택</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 text-2xl"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="flex h-[calc(80vh-120px)]">
          {/* Categories Sidebar */}
          <div className="w-64 border-r border-gray-200 overflow-y-auto p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">카테고리</h3>
            <button
              onClick={() => handleCategorySelect(null)}
              className={`w-full text-left px-3 py-2 rounded mb-1 ${
                selectedCategoryId === null
                  ? 'bg-blue-100 text-blue-700'
                  : 'hover:bg-gray-100'
              }`}
            >
              전체
            </button>
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => handleCategorySelect(category.id)}
                className={`w-full text-left px-3 py-2 rounded mb-1 ${
                  selectedCategoryId === category.id
                    ? 'bg-blue-100 text-blue-700'
                    : 'hover:bg-gray-100'
                }`}
              >
                {category.name}
              </button>
            ))}
          </div>

          {/* Templates Grid */}
          <div className="flex-1 p-6 overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-gray-500">로딩 중...</p>
              </div>
            ) : error ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-red-500">{error}</p>
              </div>
            ) : templates.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-gray-500">템플릿이 없습니다.</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-4">
                {templates.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => handleSelectTemplate(template)}
                    className="group relative aspect-[4/3] border-2 border-gray-200 rounded-lg overflow-hidden hover:border-blue-500 transition-colors"
                  >
                    {template.thumbnailUrl ? (
                      <img
                        src={template.thumbnailUrl}
                        alt={template.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="150"%3E%3Crect fill="%23f0f0f0" width="200" height="150"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%23999"%3ETemplate%3C/text%3E%3C/svg%3E';
                        }}
                      />
                    ) : (
                      <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                        <span className="text-gray-400 text-4xl">📄</span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-opacity flex items-center justify-center">
                      <span className="text-white opacity-0 group-hover:opacity-100 font-medium">
                        선택
                      </span>
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 bg-white bg-opacity-90 p-2">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {template.name}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="p-4 border-t border-gray-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded"
          >
            취소
          </button>
        </div>
      </div>
    </div>
  );
};
