import { generateText, Output } from 'ai';
import { metric } from '@vercel/functions';
import { z } from 'zod';
import { getTopicBySlug } from '@/data/curriculum';

const AskSchema = z.object({
  action: z.literal('ask'),
  topicSlug: z.string().min(1),
  topicTitle: z.string().min(1),
  language: z.enum(['en', 'fr']),
  level: z.enum(['A1', 'A2', 'B1']),
  questionPrompt: z.string().optional(),
  studentDoubt: z.string().trim().min(1).max(400),
  currentHint: z.string().optional(),
  currentExplanation: z.string().optional(),
});

const GenerateQuestionsSchema = z.object({
  action: z.literal('generate_questions'),
  topicSlug: z.string().min(1),
  topicTitle: z.string().min(1),
  language: z.enum(['en', 'fr']),
  level: z.enum(['A1', 'A2', 'B1']),
  grammarSummary: z.string().min(1).max(1500),
});

const TutorRequestSchema = z.discriminatedUnion('action', [
  AskSchema,
  GenerateQuestionsSchema,
]);

const GeneratedQuestionItemSchema = z.object({
  promptEs: z.string(),
  sentenceTarget: z.string(),
  options: z.array(z.string()).length(4),
  correctIndex: z.number().int().min(0).max(3),
  hintEs: z.string(),
  clueHighlight: z.string(),
  explanationEs: z.string(),
  spokenAnswerTarget: z.string(),
});

const GeneratedQuestionsBatchSchema = z.object({
  questions: z.array(GeneratedQuestionItemSchema).length(3),
});

function buildLocalAskFallback(data: z.infer<typeof AskSchema>) {
  const topic = getTopicBySlug(data.topicSlug);
  const firstRule = topic?.microGuide[0];
  const example = firstRule?.examples[0];
  const mistake = topic?.commonMistake;

  const parts: string[] = [];
  if (data.currentExplanation) {
    parts.push(data.currentExplanation);
  } else if (data.currentHint) {
    parts.push(`Fíjate en esta clave: ${data.currentHint}`);
  } else if (firstRule) {
    parts.push(`${firstRule.title}: ${firstRule.tip}`);
  }

  if (example) {
    parts.push(`Por ejemplo, "${example.target}", que significa ${example.spanish}.`);
  } else if (mistake) {
    parts.push(`Evita decir "${mistake.wrong}" y di "${mistake.right}".`);
  }

  if (parts.length === 0) {
    parts.push(
      `En el tema "${data.topicTitle}", revisa primero quién realiza la acción y cómo concuerda con el verbo.`
    );
  }

  return {
    reply: parts.slice(0, 3).join(' '),
    speakTarget: example?.target,
    source: 'local' as const,
  };
}

function buildLocalGeneratedQuestions(data: z.infer<typeof GenerateQuestionsSchema>) {
  const topic = getTopicBySlug(data.topicSlug);
  const existingChoices = (topic?.questions ?? []).filter(
    (q) => q.type === 'choice'
  );

  if (existingChoices.length >= 3) {
    return existingChoices.slice(0, 3).map((q, idx) => ({
      ...q,
      id: `${data.topicSlug}-extra-local-${Date.now()}-${idx}`,
    }));
  }

  const examples =
    topic?.microGuide.flatMap((g) => g.examples) ?? [
      { target: data.language === 'fr' ? 'Je suis prêt.' : 'I am ready.', spanish: 'Estoy listo.' },
    ];

  return [0, 1, 2].map((idx) => {
    const ex = examples[idx % examples.length];
    return {
      id: `${data.topicSlug}-local-gen-${Date.now()}-${idx}`,
      type: 'choice' as const,
      difficulty: 1 as const,
      promptEs: `Elige la traducción correcta para: "${ex.spanish}"`,
      options: [
        ex.target,
        data.language === 'fr' ? 'Je ne suis pas ici.' : 'She are not here.',
        data.language === 'fr' ? 'Nous avons froid.' : 'They is studying.',
        data.language === 'fr' ? 'Vous faisez bien.' : 'He do not know.',
      ],
      correctIndex: 0,
      hintEs: topic?.microGuide[0]?.tip ?? 'Fíjate en la concordancia del sujeto y el verbo.',
      clueHighlight: topic?.microGuide[0]?.formula ?? data.topicTitle,
      explanationEs: `"${ex.target}" significa "${ex.spanish}".`,
      spokenAnswerTarget: ex.target,
    };
  });
}

export async function POST(req: Request) {
  const startedAt = performance.now();
  let actionForMetric = 'unknown';
  let validatedInput: z.infer<typeof TutorRequestSchema> | null = null;

  try {
    const body = await req.json();
    const parsed = TutorRequestSchema.safeParse(body);

    if (!parsed.success) {
      metric('tutor.request', 1, { outcome: 'invalid', action: 'unknown' });
      return Response.json(
        { error: 'Solicitud inválida para tutoría.' },
        { status: 400 }
      );
    }

    const input = parsed.data;
    validatedInput = input;
    actionForMetric = input.action;

    if (input.action === 'ask') {
      const targetLangLabel = input.language === 'en' ? 'inglés' : 'francés';
      const systemPrompt = [
        'Eres una profesora universitaria colombiana cálida, cercana y muy profesional de inglés y francés.',
        'Responde siempre en español colombiano claro, amable y natural. Nunca te des un nombre propio ni menciones que eres una inteligencia artificial.',
        'Sé súper concisa: máximo 2 o 3 frases cortas en texto plano, sin guiones, sin barras inclinadas, sin asteriscos y sin listas markdown.',
        `Incluye 1 ejemplo corto y exacto en ${targetLangLabel} entre comillas dobles seguido de su significado.`,
      ].join(' ');

      const userPrompt = [
        `Tema: ${input.topicTitle} (Nivel ${input.level} de ${targetLangLabel}).`,
        input.questionPrompt ? `Ejercicio actual: ${input.questionPrompt}` : '',
        input.currentHint ? `Pista del ejercicio: ${input.currentHint}` : '',
        input.currentExplanation ? `Explicación base: ${input.currentExplanation}` : '',
        `Duda del estudiante: "${input.studentDoubt}"`,
      ]
        .filter(Boolean)
        .join('\n');

      const { text } = await generateText({
        model: 'google/gemini-3.1-flash-lite',
        system: systemPrompt,
        prompt: userPrompt,
      });

      metric('tutor.request', 1, { outcome: 'success', action: 'ask' });
      metric('tutor.duration_ms', Math.round(performance.now() - startedAt), {
        action: 'ask',
      });

      return Response.json({
        reply: text.trim(),
        source: 'ai',
      });
    }

    const targetLangName = input.language === 'en' ? 'English' : 'French';
    const { output } = await generateText({
      model: 'google/gemini-3.1-flash-lite',
      output: Output.object({
        schema: GeneratedQuestionsBatchSchema,
      }),
      system: `You are an expert ${targetLangName} university curriculum designer creating beginner-friendly multiple-choice review drills in Spanish UI.`,
      prompt: `Generate 3 brand-new, crystal-clear multiple-choice questions for level ${input.level} ${targetLangName} on the topic "${input.topicTitle}".
Grammar context: ${input.grammarSummary}
Rules:
- All prompts (promptEs), hints (hintEs), clueHighlight, and explanations (explanationEs) must be written in warm, concise Colombian Spanish without unnecessary dashes.
- Every option and spokenAnswerTarget must be 100% grammatically accurate ${targetLangName} with correct accents/punctuation.
- Provide 4 distinct options where exactly 1 is right (correctIndex 0-3). Vary correctIndex across the 3 questions.`,
    });

    const formattedQuestions = output.questions.map((item, idx) => ({
      id: `${input.topicSlug}-ai-${Date.now()}-${idx}`,
      type: 'choice' as const,
      difficulty: (input.level === 'A1' ? 1 : input.level === 'A2' ? 2 : 3) as 1 | 2 | 3,
      ...item,
    }));

    metric('tutor.request', 1, {
      outcome: 'success',
      action: 'generate_questions',
    });
    metric('tutor.duration_ms', Math.round(performance.now() - startedAt), {
      action: 'generate_questions',
    });

    return Response.json({
      questions: formattedQuestions,
      source: 'ai',
    });
  } catch (err) {
    console.warn(
      '[tutor] error, using graceful fallback:',
      err instanceof Error ? err.message : 'error'
    );
    metric('tutor.request', 1, { outcome: 'error_fallback', action: actionForMetric });
    metric('tutor.duration_ms', Math.round(performance.now() - startedAt), {
      action: actionForMetric,
    });

    if (validatedInput?.action === 'ask') {
      return Response.json(buildLocalAskFallback(validatedInput));
    }
    if (validatedInput?.action === 'generate_questions') {
      return Response.json({
        questions: buildLocalGeneratedQuestions(validatedInput),
        source: 'local',
      });
    }

    return Response.json({
      reply:
        'Fíjate primero en quién realiza la acción y busca la pista señalada en el ejercicio. Paso a paso sale fácil.',
      source: 'local',
    });
  }
}
