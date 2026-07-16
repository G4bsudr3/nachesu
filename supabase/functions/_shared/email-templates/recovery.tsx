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
  h1ClassName,
  responsiveH1Style,
  text,
  textMuted,
  bodyClassName,
  button,
  accentBar,
  footer,
  fontImport,
  FOOTER_LINE_1,
  FOOTER_LINE_2,
} from './_chora-styles.ts'

interface RecoveryEmailProps {
  siteName: string
  confirmationUrl: string
}

export const RecoveryEmail = ({ confirmationUrl }: RecoveryEmailProps) => (
  <Html lang="pt-BR" dir="ltr">
    <Head>
      <style>{fontImport}</style>
      <style>{responsiveH1Style}</style>
    </Head>
    <Preview>nova senha nachesu</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img src={WORDMARK_URL} alt="NachesU" width="132" height="37" style={wordmarkImg} />
        <Heading style={h1} className={h1ClassName}>
          nova
          <br />
          senha
        </Heading>
        <Text style={text} className={bodyClassName}>
          recebemos um pedido pra redefinir sua senha. clica no botão pra escolher uma nova.
        </Text>
        <Button style={button} className={bodyClassName} href={confirmationUrl}>
          redefinir senha
        </Button>
        <Text style={textMuted} className={bodyClassName}>
          se não foi você que pediu, ignora esse email. sua senha continua a mesma.
        </Text>
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

export default RecoveryEmail
