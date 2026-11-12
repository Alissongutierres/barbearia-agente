# Servidor do BarberBot para WhatsApp

Esta pasta contém o webhook seguro da WhatsApp Cloud API oficial da Meta.

## O que já está implementado

- verificação inicial do webhook;
- validação da assinatura `x-hub-signature-256`;
- aceitação somente de requisições GET e POST esperadas;
- leitura segura dos eventos de mensagens;
- segredos fora do código e fora do navegador;
- nenhum token armazenado no `firebase.js`.

## Segredos necessários no Firebase

- `WHATSAPP_VERIFY_TOKEN`: valor privado escolhido para confirmar o webhook;
- `META_APP_SECRET`: segredo do aplicativo criado na Meta.

## Configuração necessária

- `META_GRAPH_API_VERSION`: versão da Graph API indicada no painel da Meta.

O webhook ainda não responde ao cliente e ainda não cria agendamentos. A próxima camada implementará a conversa e consultará o Firestore antes de confirmar qualquer horário.
