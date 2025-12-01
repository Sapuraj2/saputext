import React, { useState } from 'react';
import { Wizard } from './components/Wizard';
import { BookEditor } from './components/BookEditor';
import { BookProject, WizardState } from './types';
import { generateBookStructure } from './services/geminiService';
import { DEFAULT_COLORS } from './constants';

const App: React.FC = () => {
  const [project, setProject] = useState<BookProject | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleWizardComplete = async (data: WizardState) => {
    setIsLoading(true);
    try {
      const structure = await generateBookStructure(
        data.topic,
        data.uploadedContext,
        data.genre,
        data.imageStyle,
        data.pageCount
      );

      const newProject: BookProject = {
        id: crypto.randomUUID(),
        title: structure.title || "Novo Livro",
        subtitle: structure.subtitle || "",
        topic: data.topic,
        genre: data.genre,
        imageStyle: data.imageStyle,
        totalPages: data.pageCount,
        pages: structure.pages || [],
        primaryColor: DEFAULT_COLORS.primary,
        secondaryColor: DEFAULT_COLORS.secondary,
        coverImagePrompt: structure.coverImagePrompt,
        visualIdentity: structure.visualIdentity || "Estilo padrão consistente.",
        createdAt: Date.now()
      };

      setProject(newProject);
    } catch (error) {
      console.error("Failed to create project", error);
      alert("Houve um erro ao gerar o livro. Verifique sua conexão ou tente um tema diferente.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateProject = (updatedProject: BookProject) => {
    setProject(updatedProject);
  };

  return (
    <div className="min-h-screen bg-sapu-50 font-sans">
      {!project ? (
        <div className="container mx-auto px-4 py-12 flex flex-col items-center justify-center min-h-screen">
          <div className="text-center mb-12">
            <h1 className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-sapu-600 to-sapu-800 mb-4">
              SapuText
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Transforme ideias em livros ilustrados magicamente. Onde a educação encontra a imaginação.
            </p>
          </div>
          
          <Wizard onComplete={handleWizardComplete} isLoading={isLoading} />
          
          <footer className="mt-16 text-center text-gray-400 text-sm">
            <p>© {new Date().getFullYear()} SapuText AI. Desenvolvido para criatividade sem limites.</p>
          </footer>
        </div>
      ) : (
        <BookEditor 
          project={project} 
          onUpdateProject={handleUpdateProject} 
          onBack={() => {
            if(confirm("Deseja voltar ao início? O progresso não salvo será perdido.")) {
              setProject(null);
            }
          }}
        />
      )}
    </div>
  );
};

export default App;