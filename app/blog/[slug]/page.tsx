import { Metadata } from 'next';
import defaultPostsData from '@/data/blog-posts.json';
import { BlogPostClient } from './BlogPostClient';
import { BlogPost } from '@/types/blog';

export async function generateStaticParams() {
  const posts = defaultPostsData as BlogPost[];
  return posts.map((post) => ({
    slug: post.slug,
  }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const posts = defaultPostsData as BlogPost[];
  const post = posts.find((p) => p.slug === slug);

  if (!post) {
    return {
      title: 'Artigo | Nua Borges',
      robots: { index: false, follow: false },
    };
  }

  return {
    title: `${post.title} | Diário Nua Borges`,
    description: post.subtitle,
    robots: {
      index: false,
      follow: false,
    },
  };
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const posts = defaultPostsData as BlogPost[];
  const initialPost = posts.find((p) => p.slug === slug) || null;

  return <BlogPostClient slug={slug} initialPost={initialPost} />;
}
