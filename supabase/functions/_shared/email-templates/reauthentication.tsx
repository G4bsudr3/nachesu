/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
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
  codeStyle,
  accentBar,
  footer,
  fontImport,
  FOOTER_LINE_1,
  FOOTER_LINE_2,
} from './_chora-styles.ts'

interface ReauthenticationEmailProps {
  token: string
}

export const ReauthenticationEmail = ({ token }: ReauthenticationEmailProps) => (
  <Html lang="pt-BR" dir="ltr">
    <Head>
      <style>{fontImport}</style>
      <style>{responsiveH1Style}</style>
    </Head>
    <Preview>seu código de verificação nachesu</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img src={WORDMARK_URL} alt="NachesU" width="132" height="37" style={wordmarkImg} />
        <Heading style={h1} className={h1ClassName}>
          seu
          <br />
          código
        </Heading>
        <Text style={text} className={bodyClassName}>usa o código abaixo pra confirmar sua identidade:</Text>
        <Text style={codeStyle}>{token}</Text>
        <Text style={text} className={bodyClassName}>
          válido por 10 minutos. nunca compartilha com ninguém, nem com gente que diz ser da nachesu.
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

export default ReauthenticationEmail
