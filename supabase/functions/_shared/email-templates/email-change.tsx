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
  Link,
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
  link,
  button,
  lagrimaStyle,
  footer,
  fontImport,
} from './_chora-styles.ts'

interface EmailChangeEmailProps {
  siteName: string
  email: string
  newEmail: string
  confirmationUrl: string
}

export const EmailChangeEmail = ({
  email,
  newEmail,
  confirmationUrl,
}: EmailChangeEmailProps) => (
  <Html lang="pt-BR" dir="ltr">
    <Head>
      <style>{fontImport}</style>
    </Head>
    <Preview>confirma seu novo email</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img src={LOGO_URL} alt="chŏra lovable" style={logoStyle} />
        <Heading style={h1}>
          troca de
          <br />
          email
        </Heading>
        <Text style={text}>
          você pediu pra trocar seu email de{' '}
          <Link href={`mailto:${email}`} style={link}>
            {email}
          </Link>{' '}
          pra{' '}
          <Link href={`mailto:${newEmail}`} style={link}>
            {newEmail}
          </Link>
          . clica no botão pra confirmar.
        </Text>
        <Button style={button} href={confirmationUrl}>
          confirmar troca
        </Button>
        <Text style={text}>
          se não foi você que pediu, protege sua conta agora trocando a senha.
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

export default EmailChangeEmail
