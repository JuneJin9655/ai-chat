export class ChatRequestDto {
  message!: string;
}

export class ChatResponseDto {
  message!: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}
