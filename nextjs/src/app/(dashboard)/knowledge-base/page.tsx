import { prisma } from '@/lib/db'
import { Badge } from '@/components/ui/badge'
import { formatDate } from '@/lib/utils'
import KnowledgeBaseActions from './KnowledgeBaseActions'

export default async function KunskapsBas() {
  const articles = await prisma.knowledgeBase.findMany({
    orderBy: { updatedAt: 'desc' },
  })

  const categories = [...new Set(articles.map((a) => a.category).filter(Boolean))] as string[]

  return (
    <div className="space-y-6">
      <div className="page-hero pb-5 flex items-start justify-between gap-4">
        <div>
          <p className="page-kicker">System</p>
          <h1 className="text-2xl font-bold text-gray-900 mt-0.5">Kunskapsbas</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {articles.length} artiklar
            {categories.length > 0 && ` i ${categories.length} kategorier`}
          </p>
        </div>
        <KnowledgeBaseActions categories={categories} />
      </div>

      {categories.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {categories.map((cat) => (
            <span key={cat} className="px-2.5 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
              {cat} ({articles.filter((a) => a.category === cat).length})
            </span>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {articles.length === 0 ? (
          <div className="col-span-full panel-surface p-8 text-center">
            <p className="text-sm text-gray-400">Inga artiklar ännu. Skapa den första!</p>
          </div>
        ) : (
          articles.map((article) => (
            <div key={article.id} className="panel-surface p-5 flex flex-col gap-2">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-medium text-gray-900 text-sm leading-snug">{article.title}</h3>
                <Badge variant={article.published ? 'success' : 'gray'}>
                  {article.published ? 'Publicerad' : 'Utkast'}
                </Badge>
              </div>
              {article.category && (
                <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded w-fit">
                  {article.category}
                </span>
              )}
              <p className="text-xs text-gray-500 line-clamp-3 flex-1">
                {article.content.slice(0, 200)}
              </p>
              <div className="flex items-center justify-between mt-auto pt-2">
                <span className="text-[10px] text-gray-400">{formatDate(article.updatedAt)}</span>
                <span className="text-[10px] text-gray-400">{article.views} visningar</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
