'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { anonAsksApi } from '@/lib/api';

export function useCurrentAsk(spaceId: string | undefined) {
  return useQuery({
    queryKey: ['anon-ask', spaceId],
    queryFn:  () => anonAsksApi.current(spaceId!),
    enabled:  !!spaceId,
  });
}

export function useAllAsks(spaceId: string | undefined) {
  return useQuery({
    queryKey: ['anon-asks-all', spaceId],
    queryFn:  () => anonAsksApi.all(spaceId!),
    enabled:  !!spaceId,
  });
}

export function useAskAnswers(askId: string | undefined) {
  return useQuery({
    queryKey: ['ask-answers', askId],
    queryFn:  () => anonAsksApi.answers(askId!),
    enabled:  !!askId,
  });
}

export function usePostAsk() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: anonAsksApi.post,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['anon-ask'] });
      qc.invalidateQueries({ queryKey: ['anon-asks-all'] });
    },
  });
}

export function useSubmitAnswer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; body: string; authorFirstName: string }) =>
      anonAsksApi.answer(id, data),
    onSuccess: (_, { id }) => qc.invalidateQueries({ queryKey: ['ask-answers', id] }),
  });
}

export function useLikeAnswer() {
  return useMutation({
    mutationFn: (answerId: string) => anonAsksApi.likeAnswer(answerId),
  });
}

export function useAnswerComments(answerId: string | undefined) {
  return useQuery({
    queryKey: ['answer-comments', answerId],
    queryFn:  () => anonAsksApi.answerComments(answerId!),
    enabled:  !!answerId,
  });
}

export function useAddAnswerComment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ answerId, body }: { answerId: string; body: string }) =>
      anonAsksApi.addAnswerComment(answerId, body),
    onSuccess: (_, { answerId }) =>
      qc.invalidateQueries({ queryKey: ['answer-comments', answerId] }),
  });
}
