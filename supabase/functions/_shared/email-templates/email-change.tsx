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
  Link,
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
  link,
  button,
  accentBar,
  footer,
  fontImport,
  FOOTER_LINE_1,
  FOOTER_LINE_2,
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
      <style>{responsiveH1Style}</style>
    </Head>
    <Preview>confirma seu novo email</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img src={WORDMARK_URL} alt="NachesU" width="132" height="37" style={wordmarkImg} />
        <Heading style={h1} className={h1ClassName}>
          confirma o
          <br />
          novo email
        </Heading>
        <Text style={text} className={bodyClassName}>
          você pediu pra trocar seu email de{' '}
          <Link href={`mailto:${email}`} style={link}>
            {email}
          </Link>{' '}
          pra{' '}
          <Link href={`mailto:${newEmail}`} style={link}>
            {newEmail}
          </Link>
          . clica no botão pra confirmar a troca.
        </Text>
        <Button style={button} className={bodyClassName} href={confirmationUrl}>
          confirmar troca
        </Button>
        <Text style={textMuted} className={bodyClassName}>
          se não foi você que pediu, protege sua conta agora trocando a senha.
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

export default EmailChangeEmail
