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
  bodyClassName,
  button,
  accentBar,
  footer,
  fontImport,
  FOOTER_LINE_1,
  FOOTER_LINE_2,
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
      <style>{responsiveH1Style}</style>
    </Head>
    <Preview>confirma seu email pra entrar na nachesu</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img src={WORDMARK_URL} alt="NachesU" width="132" height="37" style={wordmarkImg} />
        <Heading style={h1} className={h1ClassName}>
          bem-vinda
          <br />
          à naches.achesu
        </Heading>
        <Text style={text} className={bodyClassName}>
          você tá quase dentro. clica no botão pra confirmar seu email e começar suas eletivas.
        </Text>
        <Button style={button} href={confirmationUrl}>
          confirmar email
        </Button>
        <Text style={text} className={bodyClassName}>
          se não foi você que se cadastrou, ignora esse email tranquilo.
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

export default SignupEmail
