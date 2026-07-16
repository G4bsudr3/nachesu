/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'

import {
  main,
  container,
  WORDMARK_URL,
  wordmarkImg,
  h1,
  text,
  button,
  accentBar,
  footer,
  fontImport,
  FOOTER_LINE_1,
  FOOTER_LINE_2,
} from './_chora-styles.ts'

interface MagicLinkEmailProps {
  siteName: string
  confirmationUrl: string
}

export const MagicLinkEmail = ({ confirmationUrl }: MagicLinkEmailProps) => (
  <Html lang="pt-BR" dir="ltr">
    <Head>
      {/* evita pre-fetch de scanners (Outlook Safe Links etc) consumirem o token single-use */}
      <meta name="referrer" content="no-referrer" />
      <meta name="x-apple-disable-message-reformatting" />
      <meta httpEquiv="x-dns-prefetch-control" content="off" />
      <style>{fontImport}</style>
    </Head>
    <Preview>seu link de acesso nachesu</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img src={WORDMARK_URL} alt="NachesU" width="132" height="37" style={wordmarkImg} />
        <Heading style={h1}>
          entra
          <br />
          direto
        </Heading>
        <Text style={text}>
          clica no botão pra entrar na nachesu sem senha. o link vale por 1 hora e só funciona uma vez.
        </Text>
        <Button style={button} href={confirmationUrl}>
          entrar na nachesu
        </Button>
        <Text style={text}>
          dica: abre o link no <strong>mesmo dispositivo</strong> onde pediu. se não funcionar, pede um novo lá no app.
        </Text>
        <Text style={text}>se não foi você, ignora esse email.</Text>
        <Hr style={accentBar} />
        <Text style={footer}>
          {FOOTER_LINE_1}
          <br />
          {FOOTER_LINE_2}
        </Text>
      </Container>
    </Body>
  </Html>
)

export default MagicLinkEmail
