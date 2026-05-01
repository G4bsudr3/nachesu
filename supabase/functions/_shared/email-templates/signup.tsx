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

interface SignupEmailProps {
  siteName: string
  siteUrl: string
  recipient: string
  confirmationUrl: string
}

export const SignupEmail = ({ confirmationUrl }: SignupEmailProps) => (
  <Html lang="pt-BR" dir="ltr">
    <Head>
      <style>{fontImport}</style>
    </Head>
    <Preview>confirma seu email pra entrar no chŏra</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img src={LOGO_URL} alt="chŏra lovable" style={logoStyle} />
        <Heading style={h1}>
          confirma
          <br />
          seu email
        </Heading>
        <Text style={text}>
          você tá quase dentro. clica no botão pra confirmar o email e ativar sua conta no hub.
        </Text>
        <Button style={button} href={confirmationUrl}>
          confirmar email
        </Button>
        <Text style={text}>se não foi você que se cadastrou, ignora esse email.</Text>
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

export default SignupEmail
