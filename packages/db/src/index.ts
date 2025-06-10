/* ================= PRISMA INITIALIZATION ================= */
import { AnalysisType, Prisma, PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' 
    ? ['query', 'error', 'warn'] 
    : ['error']
});

/* ================= CORE EXPORTS ================= */
export { prisma };
export * from '@prisma/client';

/* ================= TYPE EXPORTS ================= */
export type {
  // Models (PDF Pages 9-11)
  User,
  Repository,
  CodeEmbedding,
  CodeAnalysis,
  FileNode,
  Conversation,
  Message,
  VapiCall,
  RepoInsight,
  ApiUsage,
  // Enums (PDF Page 11)
  ProcessingStatus,
  MessageRole,
  GroqModel,
  FileType,
  AnalysisType,
  InsightType,
  VapiCallStatus
} from '@prisma/client';

/* ============== VOICE INTEGRATION ============== */
// For Vapi callbacks (PDF Page 4)
export async function updateVapiCallStatus(
  vapiCallId: string,
  status: VapiCallStatus,
  metadata?: { 
    duration?: number;
    cost?: number;
    transcript?: string;
  }
) {
  return await prisma.vapiCall.update({
    where: { vapiCallId },
    data: {
      status,
      ...(metadata?.duration && { duration: metadata.duration }),
      ...(metadata?.cost && { cost: metadata.cost }),
      ...(metadata?.transcript && { transcript: metadata.transcript }),
      endedAt: status === 'COMPLETED' || status === 'FAILED' ? new Date() : undefined
    }
  });
}

/* ============ CODE INGESTION HELPERS ============ */
// For GitHub API pipeline (PDF Phase 2)
export async function markRepositoryAsFailed(
  repoId: string,
  errorMessage: string
) {
  return await prisma.repository.update({
    where: { id: repoId },
    data: {
      status: 'FAILED',
      errorMessage
    }
  });
}

/* ============ AI/DIAGRAM UTILITIES ============ */
// For Mermaid.js generation (PDF Page 3)
export async function getAnalysisByType(
  repoId: string,
  type: AnalysisType
) {
  return await prisma.codeAnalysis.findFirst({
    where: { repositoryId: repoId, type }
  });
}

/* ============ VECTOR SEARCH (LANCHAIN) ============ */
// For pgvector semantic search (PDF Page 3)
export async function findSimilarCode(
  repoId: string,
  vector: number[],
  options: {
    similarityThreshold?: number;
    limit?: number;
    language?: string;
  } = {}
) {
  const { similarityThreshold = 0.7, limit = 5, language } = options;
  
  return await prisma.$queryRaw<Array<{
    id: string;
    content: string;
    path: string;
    similarity: number;
  }>>`
    SELECT 
      id,
      content,
      path,
      1 - (vector <=> ${vector}::vector) as similarity
    FROM "CodeEmbedding"
    WHERE 
      "repositoryId" = ${repoId}
      ${language ? Prisma.sql`AND "language" = ${language}` : Prisma.empty}
      AND 1 - (vector <=> ${vector}::vector) > ${similarityThreshold}
    ORDER BY similarity DESC
    LIMIT ${limit};
  `;
}

/* ============ ANALYTICS (CHART.JS) ============ */
// For repository stats (PDF Page 3)
export async function getLanguageDistribution(repoId: string) {
  return await prisma.codeEmbedding.groupBy({
    by: ['language'],
    where: { repositoryId: repoId },
    _count: { _all: true },
    orderBy: { _count: { id: 'desc' } }
  });
}

/* ============ CONVERSATION HELPERS ============ */
// For chat/voice history (PDF Page 4)
export async function createConversation(
  userId: string,
  repoId: string,
  title?: string
) {
  return await prisma.conversation.create({
    data: {
      userId,
      repositoryId: repoId,
      title: title || `New conversation ${new Date().toLocaleString()}`
    }
  });
}

/* ============ PRISMA EXTENSIONS ============ */
// For type-safe raw queries
    export { Prisma } from '@prisma/client';