import { getProjects } from '@/lib/projects';
import HomeClient from '@/components/home-client';

export const revalidate = 0; // Dynamic server rendering to discover new uploaded GitHub folders on every request

export default function Home() {
  const projects = getProjects();

  return <HomeClient projects={projects} />;
}
