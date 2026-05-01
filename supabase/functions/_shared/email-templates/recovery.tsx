/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'

import {
  LOGO_URL,
  LAGRIMA_URL,
  main,
  container,
  logoStyle,
  h1,
  text,
  button,
  lagrimaStyle,
  footer,
  fontImport,
} from './_chora-styles.ts'

interface RecoveryEmailProps {
  siteName: string
  confirmationUrl: string
}

export const RecoveryEmail = ({ confirmationUrl }: RecoveryEmailProps) => (
  <Html lang="pt-BR" dir="ltr">
    <Head>
      <style>{fontImport}</style>
    </Head>
    <Preview>redefine sua senha do chŏra</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img src={LOGO_URL} alt="chŏra lovable" style={logoStyle} />
        <Heading style={h1}>
          nova
          <br />
          senha
        </Heading>
        <Text style={text}>
          recebemos um pedido pra redefinir sua senha. clica no botão pra escolher uma nova.
        </Text>
        <Button style={button} href={confirmationUrl}>
          redefinir senha
        </Button>
        <Text style={text}>
          se não foi você que pediu, ignora esse email. sua senha continua a mesma.
        </Text>
        <Img src={LAGRIMA_URL} alt="" style={lagrimaStyle} />
        <Text style={footer}>
          vai lá e cria.
          <br />
          chŏra lovable 2026 · 25-26 abril · porto alegre
        </Text>
      </Container>
    </Body>
  </Html>
)

export default RecoveryEmail
