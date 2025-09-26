import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Trash2, Eye, Calendar, Download, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Project, PixelationResult } from "@shared/schema";

interface ProjectWithPixelation extends Project {
  pixelationResult?: PixelationResult;
}

export default function Projects() {
  const { toast } = useToast();
  const [selectedProject, setSelectedProject] = useState<ProjectWithPixelation | null>(null);

  const { data: projects = [], isLoading } = useQuery<ProjectWithPixelation[]>({
    queryKey: ["/api/projects"],
  });

  const deleteProjectMutation = useMutation({
    mutationFn: async (projectId: string) => {
      const response = await fetch(`/api/projects/${projectId}`, { method: "DELETE" });
      if (!response.ok) throw new Error('Delete failed');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      toast({
        title: "Project deleted",
        description: "The project has been successfully deleted.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete project. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleDeleteProject = async (projectId: string) => {
    if (confirm("Are you sure you want to delete this project? This action cannot be undone.")) {
      deleteProjectMutation.mutate(projectId);
    }
  };

  const handleDownloadProject = async (project: ProjectWithPixelation) => {
    if (!project.pixelationResult) {
      toast({
        title: "Error",
        description: "This project doesn't have pixelation data to download.",
        variant: "destructive",
      });
      return;
    }

    try {
      const projectData = {
        projectName: project.name,
        createdDate: project.createdAt,
        pixelationResult: project.pixelationResult,
        settings: {
          boardCount: project.boardCount,
          boardLayout: project.boardLayout
        },
        metadata: {
          totalTiles: project.pixelationResult?.totalTiles || 0,
          uniqueColors: project.pixelationResult?.colorMap?.length || 0,
          boardCount: project.pixelationResult?.boards?.length || 0,
          version: "1.0"
        }
      };

      const { saveProjectWithDialog } = await import('@/lib/file-saver');
      await saveProjectWithDialog(projectData);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to download project. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-8">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-center h-64">
            <div className="text-lg">Loading your projects...</div>
          </div>
        </div>
      </div>
    );
  }

  // Filter for projects that have been processed and saved with pixelation results
  const completedProjects = projects.filter(p => {
    console.log('Project filter check:', { id: p.id, status: p.status, hasPixelationResult: !!p.pixelationResult, hasColorData: !!p.colorData });
    return p.status === 'completed' && (p.pixelationResult || p.colorData);
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-8">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="outline" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Home
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Your Projects</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Manage and download your saved pixelation projects
              </p>
            </div>
          </div>
        </div>

        {completedProjects.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <div className="text-center">
                <h3 className="text-lg font-semibold mb-2">No saved projects yet</h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  Create your first pixelation project to see it here.
                </p>
                <Link href="/">
                  <Button>Create New Project</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {completedProjects.map((project) => (
              <Card key={project.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg font-semibold truncate">
                        {project.name}
                      </CardTitle>
                      <div className="flex items-center gap-2 mt-2 text-sm text-gray-600 dark:text-gray-400">
                        <Calendar className="w-4 h-4" />
                        {new Date(project.createdAt || '').toLocaleDateString()}
                      </div>
                      <div className="flex gap-1 mt-2">
                        <Badge variant="secondary">
                          {project.boardCount} boards
                        </Badge>
                        <Badge variant="outline">
                          {project.boardLayout}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardHeader>

                <CardContent>
                  {project.pixelationResult?.pixelatedImageData && (
                    <div className="mb-4">
                      <img 
                        src={project.pixelationResult.pixelatedImageData}
                        alt={project.name}
                        className="w-full h-32 object-cover rounded border"
                      />
                    </div>
                  )}

                  {project.pixelationResult && (
                    <div className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                      <div>Total tiles: {project.pixelationResult.totalTiles?.toLocaleString()}</div>
                      <div>Colours used: {project.pixelationResult.colorMap?.length || 0}</div>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedProject(project)}
                          className="flex-1"
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          View
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                        <VisuallyHidden>
                          <DialogTitle>Project Preview</DialogTitle>
                        </VisuallyHidden>
                        {selectedProject?.pixelationResult && (
                          <div className="space-y-4">
                            <div className="text-center">
                              <h3 className="text-xl font-semibold">{selectedProject.name}</h3>
                              <p className="text-gray-600 dark:text-gray-400">
                                {selectedProject.boardCount} boards • {selectedProject.boardLayout} layout
                              </p>
                            </div>
                            
                            <div className="flex justify-center">
                              <img 
                                src={selectedProject.pixelationResult.pixelatedImageData}
                                alt={selectedProject.name}
                                className="max-w-full h-auto border rounded-lg"
                              />
                            </div>

                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <strong>Total Tiles:</strong> {selectedProject.pixelationResult.totalTiles?.toLocaleString()}
                              </div>
                              <div>
                                <strong>Colours Used:</strong> {selectedProject.pixelationResult.colorMap?.length || 0}
                              </div>
                              <div>
                                <strong>Created:</strong> {new Date(selectedProject.createdAt || '').toLocaleDateString()}
                              </div>
                              <div>
                                <strong>Status:</strong> <Badge variant="outline">{selectedProject.status}</Badge>
                              </div>
                            </div>
                          </div>
                        )}
                      </DialogContent>
                    </Dialog>

                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDownloadProject(project)}
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                      </DialogTrigger>
                    </Dialog>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteProject(project.id)}
                      disabled={deleteProjectMutation.isPending}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}