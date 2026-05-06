import { BridgeExtension } from '@10play/tentap-editor';

type InsertContentEditorInstance = {
  insertContent: (content: string) => void;
};

type InsertContentMessage = {
  type: 'stillnote-insert-content';
  payload: string;
};

declare module '@10play/tentap-editor' {
  interface EditorBridge {
    insertContent: (content: string) => void;
  }
}

export const InsertContentBridge = new BridgeExtension<
  object,
  InsertContentEditorInstance,
  InsertContentMessage
>({
  onBridgeMessage: (editor, message) => {
    if (message.type === 'stillnote-insert-content') {
      editor.chain().focus().insertContent(message.payload).run();
      return true;
    }

    return false;
  },
  extendEditorInstance: (sendBridgeMessage) => ({
    insertContent: (content: string) =>
      sendBridgeMessage({
        type: 'stillnote-insert-content',
        payload: content,
      }),
  }),
});
